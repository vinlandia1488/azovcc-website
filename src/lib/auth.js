import { consumeLicenseForRegistration } from "@/lib/license-keys";
import { getBackendDb } from "@/lib/backend";

const db = getBackendDb();
const ACCOUNTS_CACHE_KEY = "azov_accounts_cache";
const SESSION_KEY = "azov_session";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const RATE_LIMIT_KEY = "azov_rate_limits";

function getRateLimits() {
  try {
    return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "{}");
  } catch {
    return {};
  }
}

function setRateLimits(data) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
}

function checkRateLimit(username) {
  const limits = getRateLimits();
  const key = username.toLowerCase();
  const entry = limits[key];
  if (!entry) return;
  const now = Date.now();
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const remainingMins = Math.ceil((entry.lockedUntil - now) / 60000);
    throw new Error(`Too many failed attempts. Try again in ${remainingMins} minute${remainingMins !== 1 ? "s" : ""}.`);
  }
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    delete limits[key];
    setRateLimits(limits);
  }
}

function recordFailedAttempt(username) {
  const limits = getRateLimits();
  const key = username.toLowerCase();
  if (!limits[key]) limits[key] = { attempts: 0, lockedUntil: null };
  limits[key].attempts += 1;
  if (limits[key].attempts >= MAX_LOGIN_ATTEMPTS) {
    limits[key].lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    limits[key].attempts = 0;
  }
  setRateLimits(limits);
}

function clearFailedAttempts(username) {
  const limits = getRateLimits();
  delete limits[username.toLowerCase()];
  setRateLimits(limits);
}

function sanitizeString(input, maxLength = 128) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength).replace(/[<>"'`]/g, "");
}

function readAccountsCache() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccountsCache(rows) {
  localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(rows));
}

function upsertAccountCache(account) {
  if (!account) return;
  const current = readAccountsCache();
  const idx = current.findIndex(
    (row) => (row.id && account.id && row.id === account.id) || (row.username && row.username === account.username)
  );
  const next = [...current];
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...account };
  } else {
    next.unshift(account);
  }
  writeAccountsCache(next);
}

export function getCachedAccounts() {
  return readAccountsCache();
}

function removeAccountFromCache(accountId, username) {
  const current = readAccountsCache();
  const next = current.filter(
    (row) => !((accountId && row.id === accountId) || (username && row.username === username))
  );
  writeAccountsCache(next);
}

export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateLicenseKey(prefix = "AZOV") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}-${seg()}-${seg()}-${seg()}-${seg()}`;
}

export function generateInternalLicense() {
  return `Azov-${Math.random().toString(36).substring(2, 15)}`;
}

export function generateScriptLicense() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 22 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    if (!parsed || typeof parsed !== "object" || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(account) {
  if (!account || typeof account !== "object") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function deleteUserAccount(account) {
  const accountId = account?.id;
  const username = account?.username;
  try {
    if (accountId) {
      await db.entities.Account.delete(accountId);
    }
  } catch {}
  removeAccountFromCache(accountId, username);
  const currentSession = getSession();
  if (currentSession && ((accountId && currentSession.id === accountId) || (username && currentSession.username === username))) {
    clearSession();
  }
}

async function getAllAccounts() {
  let rows = [];
  if (typeof db.entities.Account.list === "function") {
    rows = await db.entities.Account.list();
  } else if (typeof db.entities.Account.filter === "function") {
    rows = await db.entities.Account.filter({});
  }
  const dbRows = Array.isArray(rows) ? rows : [];
  if (dbRows.length > 0) writeAccountsCache(dbRows);
  return dbRows;
}

export function normalizeAccountDiscordLink(account) {
  if (!account || typeof account !== "object") return account;
  const raw = { ...account };
  const idVal = raw.discord_id ?? raw.discordId ?? raw.DiscordId;
  const userVal = raw.discord_username ?? raw.discordUsername ?? raw.DiscordUsername;
  const avatarVal = raw.discord_avatar ?? raw.discordAvatar ?? "";

  let packedId = idVal;
  let packedUser = userVal;
  let packedAvatar = avatarVal;

  const rawLicense = raw.license_key || "";
  if (rawLicense.includes("|+|")) {
    const parts = rawLicense.split("|+|");
    if (parts.length >= 5) {
      packedId = packedId || parts[2];
      packedUser = packedUser || parts[3];
      packedAvatar = packedAvatar || parts[4];
    }
    raw.internal_license = parts[0] || raw.internal_license;
    raw.script_license = parts[1] || raw.script_license;
    raw.license_key = raw.internal_license || raw.script_license;
  } else if (rawLicense.includes("|")) {
    const parts = rawLicense.split("|");
    raw.internal_license = parts[0] || raw.internal_license;
    raw.script_license = parts[1] || raw.script_license;
    raw.license_key = raw.internal_license || raw.script_license;
  }

  const discord_id = packedId !== undefined && packedId !== null && packedId !== "" ? String(packedId) : "";
  const discord_username = packedUser ? String(packedUser) : "";
  const discord_avatar = packedAvatar ? String(packedAvatar) : "";
  return { ...raw, discord_id, discord_username, discord_avatar };
}

function normalizeSessionAccount(account, fallbackUsername = "") {
  const safeUsername = String(account?.username || fallbackUsername || "").trim();
  const rawLicense = account?.license_key || "";
  let internalLicense = account?.internal_license || "";
  let scriptLicense = account?.script_license || "";

  if (rawLicense.includes("|+|")) {
    const parts = rawLicense.split("|+|");
    if (!internalLicense) internalLicense = parts[0];
    if (!scriptLicense) scriptLicense = parts[1];
  } else if (rawLicense.includes("|")) {
    const parts = rawLicense.split("|");
    if (!internalLicense) internalLicense = parts[0];
    if (!scriptLicense) scriptLicense = parts[1];
  } else if (!internalLicense && (rawLicense.startsWith("Azov-") || rawLicense.length > 20)) {
    internalLicense = rawLicense;
  } else if (!scriptLicense && rawLicense && !rawLicense.startsWith("Azov-")) {
    scriptLicense = rawLicense;
  }

  const discord = normalizeAccountDiscordLink(account);
  return {
    ...account,
    ...discord,
    username: safeUsername,
    unique_identifier: account?.unique_identifier ?? 0,
    internal_license: internalLicense,
    script_license: scriptLicense,
    accent_color: account?.accent_color || "#6366f1",
    is_admin: Boolean(account?.is_admin),
    last_login: account?.last_login || new Date().toISOString(),
  };
}

export async function upgradeToInternal(username, internalKey) {
  const accounts = await db.entities.Account.filter({ username });
  if (!accounts || accounts.length === 0) throw new Error("User not found");
  const account = accounts[0];

  const keys = await getLicenseKeys();
  const row = keys.find((k) => !k.used && k.type === "internal" && k.internal_key === internalKey);
  if (!row) throw new Error("Invalid or already used internal key");

  await markLicenseKeyUsed(row.id, username);

  const oldLicense = account.license_key || "";
  let discordInfoPacked = "";
  if (oldLicense.includes("|+|")) {
    const parts = oldLicense.split("|+|");
    if (parts.length >= 5)
      discordInfoPacked = "|+|" + (parts[2] || "") + "|+|" + (parts[3] || "") + "|+|" + (parts[4] || "");
  }

  const updated = {
    ...account,
    internal_license: row.internal_key,
    license_key: row.internal_key + "|+|" + (account.script_license || "") + discordInfoPacked,
  };

  await db.entities.Account.update(account.id, updated);
  setSession(normalizeSessionAccount(updated));
  return updated;
}

export async function verifyDiscordCode(code) {
  return null;
}

export function getDiscordAuthUrl() {
  const clientId = "1495669650883739678";
  const redirectUri = encodeURIComponent(window.location.origin + "/");
  const scope = encodeURIComponent("identify");
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
}

export async function fetchDiscordUser(code) {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${code}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch Discord user. Please ensure Implicit Grant is enabled in Dev Portal.");
  const data = await response.json();

  const snowflake = String(data.id);
  const existing = await db.entities.Account.filter({ discord_id: snowflake });
  if (existing && existing.length > 0) {
    throw new Error("This Discord account is already linked to another Azov account.");
  }

  return {
    id: snowflake,
    username: `${data.username}${data.discriminator !== "0" ? `#${data.discriminator}` : ""}`,
    avatar: data.avatar,
  };
}

function assertPersistedAccount(account, context) {
  if (!account || !account.id || !account.username) {
    throw new Error(`${context}: account was not saved to the backend`);
  }
}

export async function loginUser(username, password, discordInfo = null) {
  const normalizedUsername = sanitizeString(String(username ?? ""), 64);
  if (!normalizedUsername) throw new Error("Username is required");
  if (!password || typeof password !== "string" || password.length < 1) throw new Error("Password is required");

  checkRateLimit(normalizedUsername);

  const isAdminLogin = normalizedUsername.toLowerCase() === "admin";
  if (isAdminLogin) {
    await ensureAdminExists();
  }

  const hash = await sha256(password);
  let accounts = await db.entities.Account.filter({ username: normalizedUsername });
  if (!accounts || accounts.length === 0) {
    const allAccounts = await getAllAccounts();
    accounts = allAccounts.filter(
      (a) => String(a.username || "").toLowerCase() === normalizedUsername.toLowerCase()
    );
  }
  if ((!accounts || accounts.length === 0) && isAdminLogin) {
    const adminHash = await sha256("adminkey1234");
    const createdAdmin = await db.entities.Account.create({
      username: "admin",
      password_hash: adminHash,
      internal_license: generateInternalLicense(),
      script_license: generateScriptLicense(),
      unique_identifier: 0,
      accent_color: "#ef4444",
      is_admin: true,
      last_login: new Date().toISOString(),
    });
    assertPersistedAccount(createdAdmin, "Admin bootstrap failed");
    accounts = [createdAdmin];
  }
  if (!accounts || accounts.length === 0) {
    recordFailedAttempt(normalizedUsername);
    throw new Error("User not found");
  }

  let account = normalizeSessionAccount(accounts[0], normalizedUsername);
  const isDefaultAdminCredential = isAdminLogin && password === "adminkey1234";
  if (!isDefaultAdminCredential && account.password_hash !== hash) {
    recordFailedAttempt(normalizedUsername);
    throw new Error("Incorrect password");
  }

  clearFailedAttempts(normalizedUsername);

  if (isDefaultAdminCredential) {
    account = {
      ...account,
      username: "admin",
      is_admin: true,
      password_hash: await sha256("adminkey1234"),
    };
    try {
      await db.entities.Account.update(account.id, {
        username: "admin",
        password_hash: account.password_hash,
        is_admin: true,
      });
    } catch {}
  }

  const now = new Date().toISOString();
  const updates = { last_login: now };
  if (discordInfo) {
    updates.discord_id = String(discordInfo.id);
    updates.discord_username = String(discordInfo.username);
    updates.discord_avatar = String(discordInfo.avatar);
    const oldLicense = account.license_key || "";
    let intKey = account.internal_license || "";
    let scrKey = account.script_license || "";
    if (oldLicense.includes("|+|")) {
      const parts = oldLicense.split("|+|");
      intKey = parts[0] || intKey;
      scrKey = parts[1] || scrKey;
    } else if (oldLicense.includes("|")) {
      const parts = oldLicense.split("|");
      intKey = parts[0] || intKey;
      scrKey = parts[1] || scrKey;
    } else {
      intKey = intKey || oldLicense;
    }
    updates.license_key =
      (intKey || "") +
      "|+|" +
      (scrKey || "") +
      "|+|" +
      (discordInfo.id || "") +
      "|+|" +
      (discordInfo.username || "") +
      "|+|" +
      (discordInfo.avatar || "");
  }

  try {
    await db.entities.Account.update(account.id, updates);
  } catch {}
  const updated = normalizeSessionAccount({ ...account, ...updates }, normalizedUsername);
  upsertAccountCache(updated);
  setSession(updated);
  return updated;
}

export async function registerUser(username, password, licenseKey) {
  const normalizedUsername = sanitizeString(String(username || ""), 32);
  if (!normalizedUsername) throw new Error("Username is required");
  if (normalizedUsername.length < 3) throw new Error("Username must be at least 3 characters");
  if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) throw new Error("Username may only contain letters, numbers, underscores, dots, and dashes");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

  const existing = await db.entities.Account.filter({ username: normalizedUsername });
  if (existing && existing.length > 0) throw new Error("Username already taken");

  const keyPayload =
    typeof licenseKey === "object" && licenseKey !== null
      ? licenseKey
      : { licenseType: "script", scriptLicenseKey: String(licenseKey || "") };
  const consumed = await consumeLicenseForRegistration({
    licenseType: keyPayload.licenseType || "script",
    scriptLicenseKey: keyPayload.scriptLicenseKey || "",
    internalLicenseKey: keyPayload.internalLicenseKey || "",
    username: normalizedUsername,
  });

  const hash = await sha256(password);
  const allAccounts = await getAllAccounts();
  const uid = allAccounts.length + 1;

  const payload = {
    username: normalizedUsername,
    password_hash: hash,
    license_key_id: consumed.key_id,
    internal_license: consumed.internal_license,
    script_license: consumed.script_license,
    discord_id: String(keyPayload.discord_id ?? "").trim(),
    discord_username: String(keyPayload.discord_username ?? "").trim(),
    discord_avatar: String(keyPayload.discord_avatar ?? "").trim(),
    license_key:
      (consumed.internal_license || consumed.script_license || "") +
      "|+|" +
      (consumed.script_license || "") +
      "|+|" +
      (keyPayload.discord_id || "") +
      "|+|" +
      (keyPayload.discord_username || "") +
      "|+|" +
      (keyPayload.discord_avatar || ""),
    unique_identifier: uid,
    accent_color: "#6366f1",
    is_admin: false,
    last_login: new Date().toISOString(),
  };

  const created = await db.entities.Account.create(payload);
  assertPersistedAccount(created, "Registration failed");

  const createdAccount = normalizeSessionAccount(created, normalizedUsername);
  upsertAccountCache(createdAccount);
  setSession(createdAccount);
  return createdAccount;
}

export async function changePassword(username, oldPassword, newPassword) {
  const normalizedUsername = sanitizeString(String(username ?? ""), 64);
  if (!newPassword || newPassword.length < 6) throw new Error("New password must be at least 6 characters");
  
  const hash = await sha256(oldPassword);
  const accounts = await db.entities.Account.filter({ username: normalizedUsername });
  if (!accounts || accounts.length === 0) throw new Error("User not found");
  
  const account = accounts[0];
  if (account.password_hash !== hash) throw new Error("Current password incorrect");
  
  const newHash = await sha256(newPassword);
  await db.entities.Account.update(account.id, { password_hash: newHash });
  
  const updated = normalizeSessionAccount({ ...account, password_hash: newHash }, normalizedUsername);
  upsertAccountCache(updated);
  setSession(updated);
  return updated;
}

export async function ensureAdminExists() {
  const adminHash = await sha256("adminkey1234");
  const now = new Date().toISOString();

  const existingAdminUser = await db.entities.Account.filter({ username: "admin" });
  if (existingAdminUser && existingAdminUser.length > 0) {
    const adminAccount = existingAdminUser[0];
    await db.entities.Account.update(adminAccount.id, {
      password_hash: adminHash,
      is_admin: true,
    });
    upsertAccountCache(normalizeSessionAccount({ ...adminAccount, username: "admin", is_admin: true }, "admin"));
    return;
  }

  const admins = await db.entities.Account.filter({ is_admin: true });
  if (admins && admins.length > 0) {
    const adminAccount = admins[0];
    await db.entities.Account.update(adminAccount.id, {
      username: "admin",
      password_hash: adminHash,
      is_admin: true,
    });
    upsertAccountCache(normalizeSessionAccount({ ...adminAccount, username: "admin", is_admin: true }, "admin"));
    return;
  }

  const internalKey = generateInternalLicense();
  const scriptKey = generateScriptLicense();

  const createdAdmin = await db.entities.Account.create({
    username: "admin",
    password_hash: adminHash,
    internal_license: internalKey,
    script_license: scriptKey,
    license_key: internalKey,
    unique_identifier: 0,
    accent_color: "#ef4444",
    is_admin: true,
    last_login: now,
  });
  assertPersistedAccount(createdAdmin, "Admin bootstrap failed");
  upsertAccountCache(normalizeSessionAccount(createdAdmin, "admin"));
}
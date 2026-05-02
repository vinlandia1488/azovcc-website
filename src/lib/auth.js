import { consumeLicenseForRegistration } from "@/lib/license-keys";
import { getBackendDb } from "@/lib/backend";

const db = getBackendDb();

const ACCOUNTS_CACHE_KEY = "azov_accounts_cache";

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
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateLicenseKey(prefix = 'AZOV') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${seg()}-${seg()}-${seg()}-${seg()}`;
}

export function generateInternalLicense() {
  return `Azov-${Math.random().toString(36).substring(2, 15)}`;
}

export function generateScriptLicense() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 22 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function getSession() {
  try {
    const s = localStorage.getItem('azov_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function setSession(account) {
  localStorage.setItem('azov_session', JSON.stringify(account));
}

export function clearSession() {
  localStorage.removeItem('azov_session');
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

function normalizeSessionAccount(account, fallbackUsername = "") {
  const safeUsername = String(account?.username || fallbackUsername || "").trim();
  return {
    ...account,
    username: safeUsername,
    unique_identifier: account?.unique_identifier ?? 0,
    internal_license: account?.internal_license || "",
    script_license: account?.script_license || "",
    accent_color: account?.accent_color || "#ef4444",
    is_admin: Boolean(account?.is_admin),
    discord_id: account?.discord_id || "",
    discord_username: account?.discord_username || "",
    last_login: account?.last_login || new Date().toISOString(),
  };
}

export async function upgradeToInternal(username, internalKey) {
  const accounts = await db.entities.Account.filter({ username });
  if (!accounts || accounts.length === 0) throw new Error("User not found");
  const account = accounts[0];

  const keys = await getLicenseKeys();
  const row = keys.find(k => !k.used && k.type === "internal" && k.internal_key === internalKey);
  if (!row) throw new Error("Invalid or already used internal key");

  await markLicenseKeyUsed(row.id, username);

  const updated = {
    ...account,
    internal_license: row.internal_key,
  };

  await db.entities.Account.update(account.id, updated);
  setSession(normalizeSessionAccount(updated));
  return updated;
}

export async function verifyDiscordCode(code) {
  // This is now replaced by real OAuth2 flow
  return null;
}

export function getDiscordAuthUrl() {
  const clientId = "1495669650883739678";
  // Dynamically use the current origin for the redirect URI
  const redirectUri = encodeURIComponent(window.location.origin + "/");
  const scope = encodeURIComponent("identify");
  // ALWAYS use response_type=token for frontend-only apps like Vercel
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
}

export async function fetchDiscordUser(code) {
  // Since the user is using response_type=code, we need to exchange the code for a token.
  // However, in a client-side only app, this is insecure/difficult.
  // We will assume for now that the user wants to handle this flow.
  // For immediate functionality, we'll implement a token exchange if possible, 
  // but usually 'code' flow requires a client_secret which we shouldn't put in frontend.
  
  // IF the user switches to 'token' (Implicit Grant), the previous logic would work.
  // Since they provided a 'code' URL, let's try to adapt or advise.
  
  // NOTE: If this fails with a CORS error, the user MUST use 'Implicit Grant' (response_type=token)
  // as discussed before for frontend-only apps.
  
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${code}`, // This will only work if 'code' is actually a token
    },
  });
  if (!response.ok) throw new Error("Failed to fetch Discord user. Please ensure Implicit Grant is enabled in Dev Portal.");
  const data = await response.json();

  const existing = await db.entities.Account.filter({ discord_id: data.id });
  if (existing && existing.length > 0) {
    throw new Error("This Discord account is already linked to another Azov account.");
  }

  return {
    id: data.id,
    username: `${data.username}${data.discriminator !== "0" ? `#${data.discriminator}` : ""}`,
  };
}

function assertPersistedAccount(account, context) {
  if (!account || !account.id || !account.username) {
    throw new Error(`${context}: account was not saved to the backend`);
  }
}

export async function loginUser(username, password) {
  const normalizedUsername = String(username ?? '').trim();
  if (!normalizedUsername) throw new Error('Username is required');

  const isAdminLogin = normalizedUsername.toLowerCase() === 'admin';
  if (isAdminLogin) {
    await ensureAdminExists();
  }

  const hash = await sha256(password);
  let accounts = await db.entities.Account.filter({ username: normalizedUsername });
  if (!accounts || accounts.length === 0) {
    // Fallback for data sources that are case-sensitive or don't index this field.
    const allAccounts = await getAllAccounts();
    accounts = allAccounts.filter(
      (a) => String(a.username || "").toLowerCase() === normalizedUsername.toLowerCase()
    );
  }
  if ((!accounts || accounts.length === 0) && isAdminLogin) {
    const adminHash = await sha256('adminkey1234');
    const createdAdmin = await db.entities.Account.create({
      username: 'admin',
      password_hash: adminHash,
      internal_license: generateInternalLicense(),
      script_license: generateScriptLicense(),
      unique_identifier: 0,
      accent_color: '#ef4444',
      is_admin: true,
      last_login: new Date().toISOString()
    });
    assertPersistedAccount(createdAdmin, "Admin bootstrap failed");
    accounts = [createdAdmin];
  }
  if (!accounts || accounts.length === 0) throw new Error('User not found');
  let account = normalizeSessionAccount(accounts[0], normalizedUsername);
  const isDefaultAdminCredential = isAdminLogin && password === 'adminkey1234';
  if (!isDefaultAdminCredential && account.password_hash !== hash) {
    throw new Error('Incorrect password');
  }

  // Keep admin record aligned with the default credential when that credential is used.
  if (isDefaultAdminCredential) {
    account = {
      ...account,
      username: "admin",
      is_admin: true,
      password_hash: await sha256('adminkey1234'),
    };
    try {
      await db.entities.Account.update(account.id, {
        username: "admin",
        password_hash: account.password_hash,
        is_admin: true
      });
    } catch {}
  }
  const now = new Date().toISOString();
  // Do not block login if updating metadata fails.
  try {
    await db.entities.Account.update(account.id, { last_login: now });
  } catch {}
  const updated = normalizeSessionAccount({ ...account, last_login: now }, normalizedUsername);
  upsertAccountCache(updated);
  setSession(updated);
  return updated;
}

export async function registerUser(username, password, licenseKey) {
  // Check if username taken
  const normalizedUsername = String(username || "").trim();
  const existing = await db.entities.Account.filter({ username: normalizedUsername });
  if (existing && existing.length > 0) throw new Error('Username already taken');

  // Validate license keys (v2 supports internal+script pair or script-only).
  const keyPayload = typeof licenseKey === "object" && licenseKey !== null
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
  const uid = (allAccounts.length + 1);

  const payload = {
    username: normalizedUsername,
    password_hash: hash,
    license_key_id: consumed.key_id,
    internal_license: consumed.internal_license,
    script_license: consumed.script_license,
    discord_id: licenseKey.discord_id || "",
    discord_username: licenseKey.discord_username || "",
    unique_identifier: uid,
    accent_color: '#ef4444',
    is_admin: false,
    last_login: new Date().toISOString()
  };

  const created = await db.entities.Account.create(payload);
  assertPersistedAccount(created, "Registration failed");

  const createdAccount = normalizeSessionAccount(created, normalizedUsername);
  upsertAccountCache(createdAccount);
  setSession(createdAccount);
  return createdAccount;
}

export async function ensureAdminExists() {
  const adminHash = await sha256('adminkey1234');
  const now = new Date().toISOString();

  const existingAdminUser = await db.entities.Account.filter({ username: 'admin' });
  if (existingAdminUser && existingAdminUser.length > 0) {
    const adminAccount = existingAdminUser[0];
    await db.entities.Account.update(adminAccount.id, {
      password_hash: adminHash,
      is_admin: true
    });
    upsertAccountCache(normalizeSessionAccount({ ...adminAccount, username: 'admin', is_admin: true }, 'admin'));
    return;
  }

  const admins = await db.entities.Account.filter({ is_admin: true });
  if (admins && admins.length > 0) {
    const adminAccount = admins[0];
    await db.entities.Account.update(adminAccount.id, {
      username: 'admin',
      password_hash: adminHash,
      is_admin: true
    });
    upsertAccountCache(normalizeSessionAccount({ ...adminAccount, username: 'admin', is_admin: true }, 'admin'));
    return;
  }

  const createdAdmin = await db.entities.Account.create({
    username: 'admin',
    password_hash: adminHash,
    internal_license: generateInternalLicense(),
    script_license: generateScriptLicense(),
    unique_identifier: 0,
    accent_color: '#ef4444',
    is_admin: true,
    last_login: now
  });
  assertPersistedAccount(createdAdmin, "Admin bootstrap failed");
  upsertAccountCache(normalizeSessionAccount(createdAdmin, 'admin'));
}
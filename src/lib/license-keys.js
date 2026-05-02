import { getBackendDb } from "@/lib/backend";

const db = getBackendDb();

const STORAGE_KEY = "azov_license_keys_v2";
const FALLBACK_NAME = "__license_keys__";
const FALLBACK_OWNER = "admin";

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function normalize(row) {
  const scriptKey = row?.script_key || row?.key || "";
  return {
    id: row?.id || `lk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: row?.type === "internal" ? "internal" : "script",
    internal_key: row?.internal_key || "",
    script_key: scriptKey,
    key: scriptKey, // Add back 'key' field for backend compatibility
    note: row?.note || "",
    used: Boolean(row?.used),
    used_by_username: row?.used_by_username || "",
    used_at: row?.used_at || null,
    created_date: row?.created_date || new Date().toISOString(),
  };
}

async function tryDbList() {
  const entity = db.entities?.LicenseKey;
  if (!entity) return [];
  if (typeof entity.list === "function") {
    const rows = await entity.list("-created_date", 300);
    return Array.isArray(rows) ? rows : [];
  }
  if (typeof entity.filter === "function") {
    const rows = await entity.filter({});
    return Array.isArray(rows) ? rows : [];
  }
  return [];
}

async function tryDbCreate(payload) {
  const entity = db.entities?.LicenseKey;
  if (!entity || typeof entity.create !== "function") {
    throw new Error("LicenseKey entity is unavailable");
  }
  const created = await entity.create(payload);
  if (!created?.id) throw new Error("Failed to persist license key");
}

async function tryDbUpdate(id, payload) {
  const entity = db.entities?.LicenseKey;
  if (!entity || typeof entity.update !== "function") {
    throw new Error("LicenseKey entity is unavailable");
  }
  await entity.update(id, payload);
}

async function tryDbDelete(id) {
  const entity = db.entities?.LicenseKey;
  if (!entity || typeof entity.delete !== "function") {
    throw new Error("LicenseKey entity is unavailable");
  }
  await entity.delete(id);
}

function isMissingSchemaError(error) {
  return String(error?.message || "").toLowerCase().includes("schema");
}

async function getFallbackRow() {
  const rows = await db.entities.CloudConfig.filter({
    name: FALLBACK_NAME,
    owner_username: FALLBACK_OWNER,
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function listFromFallbackStore() {
  const row = await getFallbackRow();
  if (!row?.content) return [];
  try {
    const parsed = JSON.parse(row.content);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize);
  } catch {
    return [];
  }
}

async function writeFallbackStore(rows) {
  const content = JSON.stringify(rows.map(normalize));
  const existing = await getFallbackRow();
  if (existing?.id) {
    await db.entities.CloudConfig.update(existing.id, { content });
    return;
  }
  await db.entities.CloudConfig.create({
    name: FALLBACK_NAME,
    owner_username: FALLBACK_OWNER,
    content,
  });
}

export async function getLicenseKeys() {
  try {
    const dbRows = (await tryDbList()).map(normalize);
    writeLocal(dbRows);
    return dbRows;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      const fallback = await listFromFallbackStore();
      writeLocal(fallback);
      return fallback;
    }
    return readLocal().map(normalize);
  }
}

export async function createLicenseKeyRecord(payload) {
  const nextRecord = normalize(payload);
  try {
    await tryDbCreate(nextRecord);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    const current = await getLicenseKeys();
    const next = [nextRecord, ...current.filter((row) => row.id !== nextRecord.id)];
    await writeFallbackStore(next);
  }
  const current = await getLicenseKeys();
  writeLocal([nextRecord, ...current.filter((row) => row.id !== nextRecord.id)]);
  return nextRecord;
}

export async function markLicenseKeyUsed(id, username) {
  const current = await getLicenseKeys();
  const usedAt = new Date().toISOString();
  const next = current.map((row) =>
    row.id === id
      ? { ...row, used: true, used_by_username: username, used_at: usedAt }
      : row
  );
  writeLocal(next);
  try {
    await tryDbUpdate(id, {
      used: true,
      used_by_username: username,
      used_at: usedAt,
    });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    await writeFallbackStore(next);
  }
}

export async function deleteLicenseKeyRecord(id) {
  const current = await getLicenseKeys();
  const next = current.filter((row) => row.id !== id);
  try {
    await tryDbDelete(id);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    await writeFallbackStore(next);
  }
  writeLocal(next);
}

export async function consumeLicenseForRegistration({
  licenseType,
  scriptLicenseKey,
  internalLicenseKey,
  username,
}) {
  const keys = await getLicenseKeys();
  const normalizedScript = String(scriptLicenseKey || "").trim();
  const normalizedInternal = String(internalLicenseKey || "").trim();

  if (licenseType === "internal") {
    if (!normalizedInternal || !normalizedScript) {
      throw new Error("Internal registration requires internal and script keys");
    }
    const row = keys.find(
      (k) =>
        !k.used &&
        k.type === "internal" &&
        k.internal_key === normalizedInternal &&
        k.script_key === normalizedScript
    );
    if (!row) throw new Error("Invalid or already used internal/script key pair");
    await markLicenseKeyUsed(row.id, username);
    return {
      internal_license: row.internal_key,
      script_license: row.script_key,
      license_key: row.script_key, // or internal_key, usually registration key is the script_key
      key_id: row.id,
    };
  }

  if (!normalizedScript) {
    throw new Error("Script registration requires a script key");
  }
  const row = keys.find(
    (k) => !k.used && k.type === "script" && k.script_key === normalizedScript
  );
  if (!row) throw new Error("Invalid or already used script key");
  await markLicenseKeyUsed(row.id, username);
  return {
    internal_license: "",
    script_license: row.script_key,
    license_key: row.script_key,
    key_id: row.id,
  };
}

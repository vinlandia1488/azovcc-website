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
  // Use 'key' or 'script_key' as the source of truth
  const rawKey = row?.key || row?.script_key || "";
  let internalKey = row?.internal_key || "";
  let scriptKey = row?.script_key || "";
  let type = row?.type;

  // Handle combined keys (internal|script) stored in the 'key' field
  // This is a fail-safe for when the backend ignores the internal_key field
  if (rawKey.includes("|")) {
    const parts = rawKey.split("|");
    internalKey = parts[0];
    scriptKey = parts[1];
    type = "internal";
  } else {
    scriptKey = rawKey;
    if (!internalKey) {
      type = "script";
    } else {
      type = "internal";
    }
  }

  return {
    id: row?.id || `lk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: String(type || "script").toLowerCase(),
    internal_key: internalKey,
    script_key: scriptKey,
    key: rawKey,
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
  try {
    const rows = typeof entity.list === "function" 
      ? await entity.list("-created_date", 300)
      : await entity.filter({});
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("DB List Failed:", e);
    return [];
  }
}

async function tryDbCreate(payload) {
  const entity = db.entities?.LicenseKey;
  if (!entity) throw new Error("LicenseKey entity is unavailable");
  
  // If it's an internal key, we bundle it into the 'key' field 
  // because we know 'key' is saved correctly by the backend.
  const storageKey = payload.type === "internal" 
    ? `${payload.internal_key}|${payload.script_key}`
    : payload.script_key;

  const dbPayload = {
    type: payload.type,
    internal_key: payload.internal_key,
    script_key: storageKey, // Store combined keys here
    key: storageKey,        // And here (schema requirement)
    note: payload.note,
    used: payload.used,
    created_date: payload.created_date || new Date().toISOString()
  };
  
  const created = await entity.create(dbPayload);
  if (!created?.id) throw new Error("Failed to create record in database");
  return created;
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
        (String(k.internal_key || "").trim() === normalizedInternal || 
         String(k.script_key || "").trim() === normalizedScript ||
         String(k.key || "").trim() === `${normalizedInternal}|${normalizedScript}`)
    );
    if (!row) throw new Error("Invalid or already used internal/script key pair");
    await markLicenseKeyUsed(row.id, username);
    return {
      internal_license: row.internal_key,
      script_license: row.script_key,
      license_key: row.script_key,
      key_id: row.id,
    };
  }

  if (!normalizedScript) {
    throw new Error("Script registration requires a script key");
  }
  const row = keys.find(
    (k) => !k.used && k.type === "script" && String(k.script_key || "").trim() === normalizedScript
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

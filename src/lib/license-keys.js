import { getBackendDb } from "@/lib/backend";

const db = getBackendDb();

const STORAGE_KEY = "azov_license_keys_v2";

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
  return {
    id: row?.id || `lk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: row?.type === "internal" ? "internal" : "script",
    internal_key: row?.internal_key || "",
    script_key: row?.script_key || "",
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

export async function getLicenseKeys() {
  try {
    const dbRows = (await tryDbList()).map(normalize);
    writeLocal(dbRows);
    return dbRows;
  } catch {
    return readLocal().map(normalize);
  }
}

export async function createLicenseKeyRecord(payload) {
  const nextRecord = normalize(payload);
  await tryDbCreate(nextRecord);
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
  await tryDbUpdate(id, {
    used: true,
    used_by_username: username,
    used_at: usedAt,
  });
}

export async function deleteLicenseKeyRecord(id) {
  const current = await getLicenseKeys();
  const next = current.filter((row) => row.id !== id);
  await tryDbDelete(id);
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
    key_id: row.id,
  };
}

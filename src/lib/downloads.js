import { getBackendDb } from "@/lib/backend";

const db = getBackendDb();

const STORAGE_KEY = "azov_download_items";
const ENTITY_NAME = "DownloadItem";
const FALLBACK_NAME = "__downloads__";
const FALLBACK_OWNER = "__system__";

export const DOWNLOAD_STATUSES = ["stable", "maintenance", "down"];

export function getDefaultDownloads() {
  return [
    {
      id: "default-internal",
      name: "Azov Internal",
      version: "Version 1.0.0",
      status: "stable",
      action_label: "DOWNLOAD",
      file_url: "",
      open_url: "",
      sort_order: 0,
    },
    {
      id: "default-script",
      name: "Azov Script",
      version: "Version 0.0.1",
      status: "stable",
      action_label: "GET SCRIPT",
      file_url: "",
      open_url: "",
      sort_order: 1,
    },
  ];
}

function normalizeItem(item, index = 0) {
  return {
    id: item?.id || `local-${Date.now()}-${index}`,
    name: item?.name || "Unnamed Download",
    version: item?.version || "Version 1.0.0",
    status: DOWNLOAD_STATUSES.includes(item?.status) ? item.status : "stable",
    action_label: item?.action_label || "DOWNLOAD",
    file_url: item?.file_url || "",
    open_url: item?.open_url || "",
    sort_order: Number.isFinite(item?.sort_order) ? item.sort_order : index,
  };
}

function toMutablePayload(item, index = 0) {
  const normalized = normalizeItem(item, index);
  return {
    name: normalized.name,
    version: normalized.version,
    status: normalized.status,
    action_label: normalized.action_label,
    file_url: normalized.file_url,
    open_url: normalized.open_url,
    sort_order: normalized.sort_order,
  };
}

function fromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, i) => normalizeItem(item, i));
  } catch {
    return [];
  }
}

function saveLocalStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function tryEntityList() {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity) return [];
  if (typeof entity.list === "function") {
    const rows = await entity.list("-sort_order", 200);
    return Array.isArray(rows) ? rows : [];
  }
  if (typeof entity.filter === "function") {
    const rows = await entity.filter({});
    return Array.isArray(rows) ? rows : [];
  }
  return [];
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
    return parsed.map((item, i) => normalizeItem(item, i));
  } catch {
    return [];
  }
}

async function writeFallbackStore(items) {
  const serialized = JSON.stringify(items.map((item, i) => normalizeItem(item, i)));
  const existing = await getFallbackRow();
  if (existing?.id) {
    await db.entities.CloudConfig.update(existing.id, { content: serialized });
    return;
  }
  await db.entities.CloudConfig.create({
    name: FALLBACK_NAME,
    owner_username: FALLBACK_OWNER,
    content: serialized,
  });
}

async function tryEntityCreate(payload) {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity || typeof entity.create !== "function") {
    throw new Error(`${ENTITY_NAME} entity is unavailable`);
  }
  const created = await entity.create(payload);
  if (!created?.id) throw new Error(`Failed to persist ${ENTITY_NAME}`);
  return created;
}

async function tryEntityUpdate(id, payload) {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity || typeof entity.update !== "function") {
    throw new Error(`${ENTITY_NAME} entity is unavailable`);
  }
  return entity.update(id, payload);
}

async function tryEntityDelete(id) {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity || typeof entity.delete !== "function") {
    throw new Error(`${ENTITY_NAME} entity is unavailable`);
  }
  return entity.delete(id);
}

export async function getDownloadItems() {
  try {
    const entityItems = await tryEntityList();
    const normalized = entityItems
      .map((item, i) => normalizeItem(item, i))
      .sort((a, b) => a.sort_order - b.sort_order);
    if (normalized.length > 0) {
      saveLocalStorage(normalized);
      return normalized;
    }

    // Seed defaults into backend so subsequent edits use real persisted IDs.
    const defaults = getDefaultDownloads();
    const createdDefaults = [];
    for (let i = 0; i < defaults.length; i += 1) {
      const created = await tryEntityCreate(normalizeItem(defaults[i], i));
      createdDefaults.push(normalizeItem(created, i));
    }
    saveLocalStorage(createdDefaults);
    return createdDefaults;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      const fallbackRows = await listFromFallbackStore();
      if (fallbackRows.length > 0) {
        saveLocalStorage(fallbackRows);
        return fallbackRows;
      }
      const defaults = getDefaultDownloads().map((item, i) => normalizeItem(item, i));
      await writeFallbackStore(defaults);
      saveLocalStorage(defaults);
      return defaults;
    }
    const localItems = fromLocalStorage();
    if (localItems.length > 0) {
      return localItems.sort((a, b) => a.sort_order - b.sort_order);
    }
    return getDefaultDownloads();
  }
}

export async function createDownloadItem(payload) {
  const current = await getDownloadItems();
  const base = normalizeItem(payload, current.length);
  let createdLocal = null;
  try {
    const created = await tryEntityCreate(toMutablePayload(base, current.length));
    createdLocal = normalizeItem(created, current.length);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    createdLocal = normalizeItem({ ...base, id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }, current.length);
  }
  const next = [...current, createdLocal];
  if (createdLocal.id.startsWith("cfg-")) {
    await writeFallbackStore(next);
  }
  saveLocalStorage(next);
  return createdLocal;
}

export async function updateDownloadItem(id, payload) {
  const current = await getDownloadItems();
  const existing = current.find((item) => item.id === id);
  if (!existing) {
    throw new Error("Download item not found");
  }
  const merged = normalizeItem({ ...existing, ...payload }, existing.sort_order);
  const mutablePayload = toMutablePayload(merged, existing.sort_order);
  let persisted = null;
  const isFallbackId = String(id).startsWith("cfg-");
  if (isFallbackId) {
    persisted = merged;
  } else if (String(id).startsWith("default-") || String(id).startsWith("local-")) {
    try {
      const created = await tryEntityCreate(mutablePayload);
      persisted = normalizeItem(created || merged, merged.sort_order);
    } catch (error) {
      if (!isMissingSchemaError(error)) throw error;
      persisted = normalizeItem({ ...merged, id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }, merged.sort_order);
    }
  } else {
    try {
      const updated = await tryEntityUpdate(id, mutablePayload);
      persisted = normalizeItem(updated || merged, merged.sort_order);
    } catch (error) {
      if (!isMissingSchemaError(error)) throw error;
      persisted = merged;
    }
  }
  const next = current.map((item) => (item.id === id ? persisted : item));
  if (persisted.id.startsWith("cfg-") || isFallbackId) {
    await writeFallbackStore(next);
  }
  saveLocalStorage(next);
  const updatedLocal = next.find((item) => item.id === persisted.id) || persisted || merged;
  return updatedLocal;
}

export async function deleteDownloadItem(id) {
  const current = await getDownloadItems();
  const next = current.filter((item) => item.id !== id);
  if (String(id).startsWith("cfg-")) {
    await writeFallbackStore(next);
    saveLocalStorage(next);
    return;
  }
  try {
    await tryEntityDelete(id);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    await writeFallbackStore(next);
  }
  saveLocalStorage(next);
}

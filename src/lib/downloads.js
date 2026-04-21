const db = globalThis.__B44_DB__ || {
  entities: new Proxy(
    {},
    {
      get: () => ({
        filter: async () => [],
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
      }),
    }
  ),
};

const STORAGE_KEY = "azov_download_items";
const ENTITY_NAME = "DownloadItem";

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

async function tryEntityCreate(payload) {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity || typeof entity.create !== "function") return null;
  return entity.create(payload);
}

async function tryEntityUpdate(id, payload) {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity || typeof entity.update !== "function") return null;
  return entity.update(id, payload);
}

async function tryEntityDelete(id) {
  const entity = db.entities?.[ENTITY_NAME];
  if (!entity || typeof entity.delete !== "function") return null;
  return entity.delete(id);
}

export async function getDownloadItems() {
  const localItems = fromLocalStorage();
  if (localItems.length > 0) {
    return localItems.sort((a, b) => a.sort_order - b.sort_order);
  }

  try {
    const entityItems = await tryEntityList();
    if (entityItems.length > 0) {
      const normalized = entityItems
        .map((item, i) => normalizeItem(item, i))
        .sort((a, b) => a.sort_order - b.sort_order);
      saveLocalStorage(normalized);
      return normalized;
    }
  } catch {}

  const defaults = getDefaultDownloads();
  saveLocalStorage(defaults);
  return defaults;
}

export async function createDownloadItem(payload) {
  const current = await getDownloadItems();
  const base = normalizeItem(payload, current.length);
  const createdLocal = normalizeItem({ ...base, id: `local-${Date.now()}` }, current.length);
  const next = [...current, createdLocal];
  saveLocalStorage(next);

  try {
    await tryEntityCreate(createdLocal);
  } catch {}

  return createdLocal;
}

export async function updateDownloadItem(id, payload) {
  const current = await getDownloadItems();
  const next = current.map((item) => (item.id === id ? normalizeItem({ ...item, ...payload }) : item));
  saveLocalStorage(next);
  const updatedLocal = next.find((item) => item.id === id) || null;

  try {
    await tryEntityUpdate(id, payload);
  } catch {}

  return updatedLocal;
}

export async function deleteDownloadItem(id) {
  const current = await getDownloadItems();
  const next = current.filter((item) => item.id !== id);
  saveLocalStorage(next);

  try {
    await tryEntityDelete(id);
  } catch {}
}

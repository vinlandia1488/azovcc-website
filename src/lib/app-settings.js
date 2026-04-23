const db = globalThis.__B44_DB__ || globalThis.db || {
  entities: new Proxy({}, { get: () => ({ filter: async () => [], create: async () => ({}), update: async () => ({}) }) }),
};

const ANNOUNCEMENT_NAME = "__announcement__";
const SYSTEM_OWNER = "__system__";

export async function getAnnouncement() {
  const rows = await db.entities.CloudConfig.filter({
    name: ANNOUNCEMENT_NAME,
    owner_username: SYSTEM_OWNER,
  });
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return String(row?.content || "");
}

export async function setAnnouncement(announcement) {
  const nextAnnouncement = String(announcement || "");
  const rows = await db.entities.CloudConfig.filter({
    name: ANNOUNCEMENT_NAME,
    owner_username: SYSTEM_OWNER,
  });
  const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (existing?.id) {
    await db.entities.CloudConfig.update(existing.id, { content: nextAnnouncement });
    return;
  }
  await db.entities.CloudConfig.create({
    name: ANNOUNCEMENT_NAME,
    owner_username: SYSTEM_OWNER,
    content: nextAnnouncement,
  });
}

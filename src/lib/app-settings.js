import { getBackendDb } from "@/lib/backend";

const db = getBackendDb();

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
  } else {
    await db.entities.CloudConfig.create({
      name: ANNOUNCEMENT_NAME,
      owner_username: SYSTEM_OWNER,
      content: nextAnnouncement,
    });
  }
  const checkRows = await db.entities.CloudConfig.filter({
    name: ANNOUNCEMENT_NAME,
    owner_username: SYSTEM_OWNER,
  });
  const check = Array.isArray(checkRows) && checkRows.length > 0 ? checkRows[0] : null;
  if (String(check?.content || "") !== nextAnnouncement) {
    throw new Error("Failed to persist announcement to backend");
  }
}

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

const MAINTENANCE_NAME = "__maintenance__";

export async function getMaintenance() {
  const rows = await db.entities.CloudConfig.filter({
    name: MAINTENANCE_NAME,
    owner_username: SYSTEM_OWNER,
  });
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row?.content) return { active: false, from: '', to: '' };
  try {
    return JSON.parse(row.content);
  } catch {
    return { active: false, from: '', to: '' };
  }
}

export async function setMaintenance(data) {
  const content = JSON.stringify(data);
  const rows = await db.entities.CloudConfig.filter({
    name: MAINTENANCE_NAME,
    owner_username: SYSTEM_OWNER,
  });
  const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (existing?.id) {
    await db.entities.CloudConfig.update(existing.id, { content });
  } else {
    await db.entities.CloudConfig.create({
      name: MAINTENANCE_NAME,
      owner_username: SYSTEM_OWNER,
      content,
    });
  }
}

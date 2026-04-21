const STORAGE_KEY = "azov_app_settings";

function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getAnnouncement() {
  const data = readSettings();
  return String(data.announcement || "");
}

export function setAnnouncement(announcement) {
  const data = readSettings();
  writeSettings({
    ...data,
    announcement: String(announcement || ""),
  });
}

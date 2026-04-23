export function getBackendDb() {
  const client = globalThis.__B44_DB__ || globalThis.db;
  if (!client || !client.entities) {
    throw new Error("Backend is not configured. Set Base44 runtime/env and redeploy.");
  }
  return client;
}

export function requireEntity(entityName) {
  const db = getBackendDb();
  const entity = db.entities?.[entityName];
  if (!entity) {
    throw new Error(`Backend entity "${entityName}" is unavailable.`);
  }
  return entity;
}

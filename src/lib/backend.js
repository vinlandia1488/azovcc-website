function backendUnavailableError() {
  return new Error("Backend is not configured. Set Base44 runtime/env and redeploy.");
}

function unavailableEntity() {
  return {
    list: async () => { throw backendUnavailableError(); },
    filter: async () => { throw backendUnavailableError(); },
    get: async () => { throw backendUnavailableError(); },
    create: async () => { throw backendUnavailableError(); },
    update: async () => { throw backendUnavailableError(); },
    delete: async () => { throw backendUnavailableError(); },
  };
}

export function getBackendDb() {
  const client = globalThis.__B44_DB__ || globalThis.db;
  if (client && client.entities) return client;
  return {
    entities: new Proxy({}, { get: () => unavailableEntity() }),
    auth: {
      isAuthenticated: async () => false,
      me: async () => null,
    },
    integrations: {
      Core: {
        UploadFile: async () => { throw backendUnavailableError(); },
      },
    },
  };
}

export function requireEntity(entityName) {
  const db = getBackendDb();
  const entity = db.entities?.[entityName];
  if (!entity) {
    throw new Error(`Backend entity "${entityName}" is unavailable.`);
  }
  return entity;
}

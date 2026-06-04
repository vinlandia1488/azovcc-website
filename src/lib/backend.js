import { createClient } from "@base44/sdk";

let sdkClient = null;

function backendUnavailableError() {
  return new Error("Backend is not configured. Set Base44 env vars and redeploy.");
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

  if (!sdkClient) {
    const appId = import.meta.env.VITE_BASE44_APP_ID || (typeof process !== 'undefined' ? process.env.VITE_BASE44_APP_ID : null);
    const apiKey = import.meta.env.VITE_BASE44_API_KEY || (typeof process !== 'undefined' ? process.env.VITE_BASE44_API_KEY : null);
    
    if (appId && apiKey) {
      sdkClient = createClient({
        appId,
        headers: {
          api_key: apiKey,
        },
      });
    }
  }
  if (sdkClient && sdkClient.entities) return sdkClient;

  // Final fallback: try to find it on globalThis again in case it was set late
  if (globalThis.__B44_DB__ && globalThis.__B44_DB__.entities) return globalThis.__B44_DB__;
  if (globalThis.db && globalThis.db.entities) return globalThis.db;

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

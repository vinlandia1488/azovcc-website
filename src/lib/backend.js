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
  // 1. Try globals first (set by vite-plugin)
  const client = globalThis.__B44_DB__ || globalThis.db;
  if (client && client.entities) return client;

  // 2. Try to initialize from env vars if not already done
  if (!sdkClient) {
    const appId = import.meta.env.VITE_BASE44_APP_ID || 
                  (typeof process !== 'undefined' ? process.env.VITE_BASE44_APP_ID : null) ||
                  "69e5c33e8412f03b6383813f"; // Fallback from screenshot
                  
    const apiKey = import.meta.env.VITE_BASE44_API_KEY || 
                   (typeof process !== 'undefined' ? process.env.VITE_BASE44_API_KEY : null) ||
                   "b253be29e6874020a3916e8d1c6eea70"; // Fallback from screenshot
    
    if (appId && apiKey) {
      try {
        sdkClient = createClient({
          appId,
          headers: {
            api_key: apiKey,
          },
        });
      } catch (err) {
        console.error("Failed to create Base44 client:", err);
      }
    }
  }

  // 3. Return initialized client if successful
  if (sdkClient && sdkClient.entities) return sdkClient;

  // 4. Final attempt: check globals again
  if (globalThis.__B44_DB__?.entities) return globalThis.__B44_DB__;
  if (globalThis.db?.entities) return globalThis.db;

  // 5. Fallback to unavailable mock
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

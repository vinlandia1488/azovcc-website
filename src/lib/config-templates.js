const SYSTEM_OWNER = "__system__";
const TEMPLATES_NAME = "__config_templates__";

import { getBackendDb } from "@/lib/backend";

export const DEFAULT_CLOUD_CONFIG = `shared.azov = {
    ["Main"] = {
        ["Selection System"] = "Auto", -- Auto, Target
        ["Selection Color"] = Color3.fromRGB(0, 255, 0),
    },

    ["Aimbot"] = {
        ["Enabled"] = false,
        ["FOV"] = 120,
        ["Smoothness"] = 0.15,
        ["Target Part"] = "Head",
        ["Prediction"] = true,
    },

    ["ESP"] = {
        ["Enabled"] = true,
        ["Box"] = true,
        ["Name"] = true,
        ["Distance"] = true,
        ["Health Bar"] = true,
    },

    ["Misc"] = {
        ["Speed"] = {
            ["Enabled"] = false,
            ["Value"] = 32,
        },
    },
}`;

export const DEFAULT_PREVIEW_CONFIG = `shared.azov = {
    ["Main"] = {
        ["Selection System"] = "Auto", -- Auto, Target
        ["Selection Color"] = Color3.fromRGB(0, 255, 0),

        ["Checks"] = {
            ["Target"] = {
                ["Knocked"] = true,
                ["Grabbed"] = true,
                ["Visible"] = true,
                ["Visible When Locking"] = false
            },

            ["Auto"] = {
                ["Knocked"] = true,
                ["Grabbed"] = true,
                ["Visible"] = true
            },

            ["Camlock"] = {
                ["Shift Lock"] = false,
                ["First Person"] = true,
                ["Third Person"] = false
            }
        },
    },

    ["Keybinds"] = {
        ["Target"] = "C",

        ["Camlock"] = "Z",
        ["Triggerbot"] = "V",

        ["ESP"] = "B",

        ["Speed"] = "Z",
        ["Flight"] = "G",
        ["Noclip"] = "N",
    },

    ["Aimbot"] = {
        ["Enabled"] = false,
        ["FOV"] = 120,
        ["Smoothness"] = 0.15,
        ["Target Part"] = "Head",
        ["Prediction"] = true,
        ["Prediction Value"] = 0.15,
    },

    ["Triggerbot"] = {
        ["Enabled"] = false,
        ["Delay"] = 0.05,
        ["FOV"] = 30,
    },

    ["ESP"] = {
        ["Enabled"] = true,
        ["Box"] = true,
        ["Name"] = true,
        ["Distance"] = true,
        ["Health Bar"] = true,
        ["Team Check"] = true,
    },

    ["Skin Changer"] = {
        ["Skins"] = {
            ["Double-Barrel SG"] = "Galaxy",
            ["Revolver"] = "Galaxy",
            ["TacticalShotgun"] = "Galaxy",
            ["Knife"] = "Golden Age Tanto"
        },
        ["Bullet Modification"] = {
            ["Enabled"] = false,
        },
    },

    ["Misc"] = {
        ["Speed"] = {
            ["Enabled"] = false,
            ["Value"] = 32,
        },
        ["Flight"] = {
            ["Enabled"] = false,
            ["Speed"] = 80,
        },
        ["Anti-Aim"] = {
            ["Enabled"] = false,
            ["Type"] = "Spin", -- Spin, Jitter
        },
    },
}`;

let memoryCache = null;

export function getDefaultCloudConfig() {
  return String(memoryCache?.defaultCloudConfig || DEFAULT_CLOUD_CONFIG);
}

export function setDefaultCloudConfig(value) {
  memoryCache = {
    ...(memoryCache || {}),
    defaultCloudConfig: String(value || ""),
  };
}

export function getPreviewConfig() {
  return String(memoryCache?.previewConfig || DEFAULT_PREVIEW_CONFIG);
}

export function setPreviewConfig(value) {
  memoryCache = {
    ...(memoryCache || {}),
    previewConfig: String(value || ""),
  };
}

async function getTemplatesRow() {
  const db = getBackendDb();
  const rows = await db.entities.CloudConfig.filter({
    name: TEMPLATES_NAME,
    owner_username: SYSTEM_OWNER,
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function coerceTemplatesPayload(input) {
  const fallback = memoryCache || {};
  return {
    defaultCloudConfig: String(
      input?.defaultCloudConfig ?? fallback.defaultCloudConfig ?? DEFAULT_CLOUD_CONFIG
    ),
    previewConfig: String(
      input?.previewConfig ?? fallback.previewConfig ?? DEFAULT_PREVIEW_CONFIG
    ),
  };
}

export async function getConfigTemplatesShared() {
  const db = getBackendDb();
  try {
    const row = await getTemplatesRow();
    if (row?.content) {
      const parsed = JSON.parse(row.content);
      const payload = coerceTemplatesPayload(parsed);
      memoryCache = payload;
      return payload;
    }
  } catch {}
  // If backend missing/unavailable, fall back to in-memory templates/defaults.
  return coerceTemplatesPayload(memoryCache);
}

export async function saveConfigTemplatesShared({ defaultCloudConfig, previewConfig }) {
  const db = getBackendDb();
  const payload = coerceTemplatesPayload({ defaultCloudConfig, previewConfig });
  const row = await getTemplatesRow();
  const content = JSON.stringify(payload);
  if (row?.id) {
    await db.entities.CloudConfig.update(row.id, { content });
  } else {
    await db.entities.CloudConfig.create({
      name: TEMPLATES_NAME,
      owner_username: SYSTEM_OWNER,
      content,
    });
  }
  memoryCache = payload;
  return payload;
}

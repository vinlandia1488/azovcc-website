const STORAGE_KEY = "azov_config_templates";

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

function readTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTemplates(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getDefaultCloudConfig() {
  const data = readTemplates();
  return String(data.defaultCloudConfig || DEFAULT_CLOUD_CONFIG);
}

export function setDefaultCloudConfig(value) {
  const data = readTemplates();
  writeTemplates({
    ...data,
    defaultCloudConfig: String(value || ""),
  });
}

export function getPreviewConfig() {
  const data = readTemplates();
  return String(data.previewConfig || DEFAULT_PREVIEW_CONFIG);
}

export function setPreviewConfig(value) {
  const data = readTemplates();
  writeTemplates({
    ...data,
    previewConfig: String(value || ""),
  });
}

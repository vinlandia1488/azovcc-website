import { createClient } from "@base44/sdk";

const RAW_CONFIG_NAME = "__RAW_CONFIG__";

function applyExecutorMode(content) {
  if (!content) return "";
  // Strip blocks between --[INTERNAL_START]-- and --[INTERNAL_END]--
  let result = content.replace(/--\[INTERNAL_START\]--[\s\S]*?--\[INTERNAL_END\]--/g, "");
  // Strip lines that look like internal function definitions
  // Using a more robust regex for functions that might have spaces, tabs, or start with local
  result = result.replace(/^(local\s+)?function\s+internal_[\w_]*\s*\(.*?\)/gm, "-- [STRIPPED INTERNAL FUNCTION]");
  return result;
}

const ALLOWED_ORIGINS = [
  "https://azovcc.vercel.app",
  "https://azovcc.com",
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const appId = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
    const apiKey = process.env.BASE44_API_KEY || process.env.VITE_BASE44_API_KEY;

    if (!appId || !apiKey) {
      return res.status(500).send(Buffer.from("[ERROR] Missing Env Vars").toString("base64"));
    }

    const client = createClient({
      appId,
      headers: { api_key: apiKey },
    });

    const { id } = req.query;
    const queryValues = Object.values(req.query || {}).filter((v) => typeof v === "string" && v.trim() !== "");
    const key =
      (typeof req.query?.key === "string" && req.query.key) ||
      (typeof req.query?.k === "string" && req.query.k) ||
      (typeof req.query?.license === "string" && req.query.license) ||
      (typeof req.query?.token === "string" && req.query.token) ||
      queryValues[0] ||
      "";

    // 1. Fetch by Config ID
    if (id) {
      const rows = await client.entities.CloudConfig.filter({
        id: { "$regex": `^${id}` }
      });
      if (rows && rows.length > 0) {
        return res.status(200).send(Buffer.from(rows[0].content || "").toString("base64"));
      }
      return res.status(404).send(Buffer.from("[ERROR] Config not found").toString("base64"));
    }

    // 2. Fetch by License Key (User Selection)
    if (key) {
      const rows = await client.entities.Account.filter({
        "$or": [
          { internal_license: key },
          { license_key: key }
        ]
      });

      if (rows && rows.length > 0) {
        const acc = rows[0];
        let content = "";

        // Priority 1: dedicated raw config saved from Cloud Configs tab.
        const username = String(acc.username || "").trim();
        if (username) {
          const byOwner = await client.entities.CloudConfig.filter({ owner_username: username });
          let rawRow = (byOwner || []).find((r) => String(r.name || "") === RAW_CONFIG_NAME);
          if (!rawRow) {
            const allRows = await client.entities.CloudConfig.filter({});
            rawRow = (allRows || []).find(
              (r) =>
                String(r.owner_username || "").toLowerCase() === username.toLowerCase() &&
                String(r.name || "") === RAW_CONFIG_NAME
            );
          }
          if (rawRow && String(rawRow.content || "").trim() !== "") {
            content = String(rawRow.content || "");
          }
        }

        // Priority 2: legacy account-backed selected content.
        if (!content || content.trim() === "") {
          content = acc.selected_config_content;
        }

        // If user hasn't selected a config yet, try to fetch the default template
        if (!content || content.trim() === "") {
          const templateRows = await client.entities.CloudConfig.filter({
            name: "__config_templates__",
            owner_username: "admin"
          });
          if (templateRows && templateRows.length > 0) {
            try {
              const templates = JSON.parse(templateRows[0].content);
              content = templates.defaultCloudConfig || "";
            } catch (e) {}
          }
        }

        const safeUsername = String(acc.username || "").trim();
        let finalContent = String(content || "");
        const isExecutor = acc.executor_mode === true;
        
        if (isExecutor) {
          finalContent = applyExecutorMode(finalContent);
          res.setHeader("X-Executor-Mode", "true");
        }

        const payload = {
          username: safeUsername,
          executor_mode: isExecutor,
          is_executor: isExecutor, // Duplicate for compatibility
          // Keep payload explicit for software consumers that want a direct raw endpoint.
          raw_url: safeUsername ? `https://azovcc.vercel.app/${encodeURIComponent(safeUsername)}/configs` : "",
          settings_url: safeUsername ? `https://azovcc.vercel.app/${encodeURIComponent(safeUsername)}/settings` : "",
          content: finalContent,
          run_id: acc.run_id || "default",
          reveal_console: acc.reveal_console === true
        };
        return res.status(200).send(Buffer.from(JSON.stringify(payload)).toString("base64"));
      }
      return res.status(404).send(Buffer.from("[ERROR] User selection not found").toString("base64"));
    }

    // 3. Default: Fetch Admin Templates
    const rows = await client.entities.CloudConfig.filter({
      name: "__config_templates__",
      owner_username: "admin"
    });

    if (rows && rows.length > 0) {
      try {
        const templates = JSON.parse(rows[0].content);
        return res.status(200).send(Buffer.from(templates.defaultCloudConfig || "").toString("base64"));
      } catch (e) {
        return res.status(500).send(Buffer.from("[ERROR] Invalid templates format").toString("base64"));
      }
    }

    return res.status(404).send(Buffer.from("[ERROR] Default config not found").toString("base64"));
  } catch (err) {
    console.error(err);
    return res.status(500).send(Buffer.from("[ERROR] Internal Server Error").toString("base64"));
  }
}

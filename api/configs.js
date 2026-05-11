import { createClient } from "@base44/sdk";

const RAW_CONFIG_NAME = "__RAW_CONFIG__";

function applyExecutorMode(content) {
  if (!content) return "";
  // Strip blocks between --[INTERNAL_START]-- and --[INTERNAL_END]--
  let result = content.replace(/--\[INTERNAL_START\]--[\s\S]*?--\[INTERNAL_END\]--/g, "");
  // Strip lines that look like internal function definitions
  result = result.replace(/^function\s+internal_.*$/gm, "-- [STRIPPED INTERNAL FUNCTION]");
  return result;
}

export default async function handler(req, res) {
  // Set headers for raw plain text output
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const appId = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
    const apiKey = process.env.BASE44_API_KEY || process.env.VITE_BASE44_API_KEY;

    if (!appId || !apiKey) {
      return res.status(500).send("[ERROR] Server configuration error");
    }

    const client = createClient({
      appId,
      headers: { api_key: apiKey },
    });

    // HANDLE SAVING (POST)
    if (req.method === "POST") {
      const parsedBody = typeof req.body === "string"
        ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
        : (req.body || {});
      const username = String(parsedBody.username || "").trim();
      const content = String(parsedBody.content || "");
      if (!username) {
        return res.status(400).send("[ERROR] Username required");
      }

      // Upsert a dedicated raw config row per username.
      let rawRow = null;
      const userRows = await client.entities.CloudConfig.filter({ owner_username: username });
      if (Array.isArray(userRows) && userRows.length > 0) {
        rawRow = userRows.find(
          (r) => String(r.name || "") === RAW_CONFIG_NAME
        );
      }
      if (!rawRow) {
        const allRows = await client.entities.CloudConfig.filter({});
        rawRow = (allRows || []).find(
          (r) =>
            String(r.owner_username || "").toLowerCase() === username.toLowerCase() &&
            String(r.name || "") === RAW_CONFIG_NAME
        );
      }

      if (rawRow) {
        await client.entities.CloudConfig.update(rawRow.id, { content });
      } else {
        rawRow = await client.entities.CloudConfig.create({
          owner_username: username,
          name: RAW_CONFIG_NAME,
          content
        });
      }

      // Backward compatibility with old consumer fields (best effort only).
      try {
        const allAccounts = await client.entities.Account.filter({});
        const account = allAccounts.find(
          (a) => String(a.username || "").toLowerCase() === username.toLowerCase()
        );
        if (account) {
          await client.entities.Account.update(account.id, {
            selected_config_content: content,
            active_config_id: rawRow.id,
            run_id: Math.random().toString(36).substring(7)
          });
        }
      } catch {}

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json({
        success: true,
        username,
        config_id: rawRow.id
      });
    }

    // HANDLE LOADING (GET)
    const { username } = req.query;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (!username) {
      return res.status(400).send("[ERROR] Username required");
    }

    // Priority 1: dedicated raw config row (single source of truth).
    const rowsByOwner = await client.entities.CloudConfig.filter({ owner_username: username });
    let rawRow = (rowsByOwner || []).find((r) => String(r.name || "") === RAW_CONFIG_NAME);
    if (!rawRow) {
      const allRows = await client.entities.CloudConfig.filter({});
      rawRow = (allRows || []).find(
        (r) =>
          String(r.owner_username || "").toLowerCase() === String(username).toLowerCase() &&
          String(r.name || "") === RAW_CONFIG_NAME
      );
    }
    
    // Find account to check executor mode
    const allAccountsForCheck = await client.entities.Account.filter({});
    const accountForCheck = allAccountsForCheck.find(a => 
      String(a.username || "").toLowerCase() === username.toLowerCase()
    );

    if (rawRow && String(rawRow.content || "").length > 0) {
      let finalContent = String(rawRow.content || "");
      if (accountForCheck?.executor_mode === true) {
        res.setHeader("X-Executor-Mode", "true");
        finalContent = "-- AZOV_EXECUTOR_MODE = true\n" + applyExecutorMode(finalContent);
      }
      return res.status(200).send(finalContent);
    }

    if (accountForCheck) {
      const acc = accountForCheck;
      
      // PRIORITY 1: Check selected_config_content (the direct "applied" code)
      let content = acc.selected_config_content;

      // PRIORITY 2: If direct content is empty, check if user has an active_config_id
      if ((!content || content.trim() === "") && acc.active_config_id) {
        const activeConfig = await client.entities.CloudConfig.get(acc.active_config_id);
        if (activeConfig && activeConfig.content) {
          content = activeConfig.content;
        }
      }

      // FALLBACK: Default template if everything else is empty
      if (!content || content.trim() === "") {
        const templateRows = await client.entities.CloudConfig.filter({
          name: "__config_templates__",
          owner_username: "admin"
        });
        if (templateRows && templateRows.length > 0) {
          try {
            let rawTemplate = templateRows[0].content;
            
            // If the template content is a URL, fetch it first
            if (rawTemplate && (rawTemplate.startsWith("http://") || rawTemplate.startsWith("https://"))) {
              const fetchRes = await fetch(rawTemplate);
              if (fetchRes.ok) {
                rawTemplate = await fetchRes.text();
              }
            }

            // Try to parse the template as JSON to get the specific "defaultCloudConfig" field
            try {
              const templates = JSON.parse(rawTemplate);
              content = templates.defaultCloudConfig || rawTemplate;
            } catch (e) {
              // If it's not JSON, just use the raw text
              content = rawTemplate;
            }
          } catch (e) {
            content = "-- Error retrieving default template";
          }
        } else {
          content = "-- No config applied and no template found";
        }
      }

      // Final step: If the final content is a URL, fetch it one last time
      if (content && (content.startsWith("http://") || content.startsWith("https://"))) {
        try {
          const finalFetch = await fetch(content);
          if (finalFetch.ok) {
            content = await finalFetch.text();
          }
        } catch (e) {}
      }

      let finalContent = String(content || "");
      if (acc.executor_mode === true) {
        res.setHeader("X-Executor-Mode", "true");
        finalContent = "-- AZOV_EXECUTOR_MODE = true\n" + applyExecutorMode(finalContent);
      }

      // Return the RAW content as clean Lua
      return res.status(200).send(finalContent);
    }

    return res.status(404).send("[ERROR] User not found");
  } catch (err) {
    console.error(err);
    return res.status(500).send("[ERROR] Internal Server Error");
  }
}

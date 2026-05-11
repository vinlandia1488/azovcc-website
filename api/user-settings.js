import { createClient } from "@base44/sdk";

export default async function handler(req, res) {
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
      return res.status(500).send("-- [ERROR] Server configuration error");
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
      if (!username) {
        return res.status(400).json({ success: false, error: "Username required" });
      }

      const allAccounts = await client.entities.Account.filter({});
      const account = allAccounts.find(a => 
        String(a.username || "").toLowerCase() === username.toLowerCase()
      );

      if (!account) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const updates = {};
      if (parsedBody.executor_mode !== undefined) {
        updates.executor_mode = Boolean(parsedBody.executor_mode);
      }
      if (parsedBody.accent_color !== undefined) {
        updates.accent_color = String(parsedBody.accent_color);
      }

      await client.entities.Account.update(account.id, updates);

      return res.status(200).json({ success: true, updates });
    }

    // HANDLE LOADING (GET)
    const { username } = req.query;
    if (!username) {
      return res.status(400).send("-- [ERROR] Username required");
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const allAccounts = await client.entities.Account.filter({});
    const account = allAccounts.find(a => 
      String(a.username || "").toLowerCase() === username.toLowerCase()
    );

    if (!account) {
      return res.status(404).send("-- [ERROR] User not found");
    }

    // Return the settings as raw Lua variables
    let output = `-- user settings: ${account.username}\n`;
    output += `executor_mode = ${account.executor_mode === true ? "true" : "false"}\n`;
    output += `accent_color = "${account.accent_color || "#ef4444"}"\n`;
    
    return res.status(200).send(output);
  } catch (err) {
    console.error(err);
    return res.status(500).send("-- [ERROR] Internal Server Error");
  }
}

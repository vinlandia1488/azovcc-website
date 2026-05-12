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
      if (req.method === "POST") return res.status(500).json({ success: false, error: "Server configuration error" });
      return res.status(500).send("-- [ERROR] Server configuration error");
    }

    const client = createClient({
      appId,
      headers: { api_key: apiKey },
    });

    const parsedBody = typeof req.body === "string"
      ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
      : (req.body || {});

    const { username: queryUsername } = req.query;
    const username = (queryUsername || parsedBody.username || "").trim();

    if (!username) {
      if (req.method === "POST") return res.status(400).json({ success: false, error: "Username required" });
      return res.status(400).send("-- [ERROR] Username required");
    }

    // Find account using a more robust filter if possible, otherwise fallback to finding in list
    let account = null;
    try {
      const filtered = await client.entities.Account.filter({ username });
      if (filtered && filtered.length > 0) {
        account = filtered[0];
      }
    } catch (e) {
      console.warn("Filter failed, falling back to all accounts list", e);
    }

    if (!account) {
      const allAccounts = await client.entities.Account.filter({});
      account = (allAccounts || []).find(a =>
        String(a.username || "").toLowerCase() === username.toLowerCase()
      );
    }

    if (!account) {
      if (req.method === "POST") return res.status(404).json({ success: false, error: "User not found" });
      return res.status(404).send("-- [ERROR] User not found");
    }

    // HANDLE SAVING (POST)
    if (req.method === "POST") {
      const updates = {};
      if (parsedBody.executor_mode !== undefined) {
        const val = Boolean(parsedBody.executor_mode);
        updates.executor_mode = val;
        updates.is_executor = val; // Set both for compatibility
      }
      if (parsedBody.accent_color !== undefined) {
        updates.accent_color = String(parsedBody.accent_color);
      }
      if (parsedBody.reveal_console !== undefined) {
        updates.reveal_console = Boolean(parsedBody.reveal_console);
      }

      await client.entities.Account.update(account.id, updates);

      return res.status(200).json({ success: true, updates });
    }

    // HANDLE LOADING (GET)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    // Return the settings as raw Lua variables
    let output = `-- user settings: ${account.username}\n`;
    output += `executor_mode = ${account.executor_mode === true || account.is_executor === true ? "true" : "false"}\n`;
    output += `accent_color = "${account.accent_color || "#ef4444"}"\n`;
    output += `reveal_console = ${account.reveal_console === true ? "true" : "false"}\n`;

    return res.status(200).send(output);
  } catch (err) {
    console.error(err);
    if (req.method === "POST") return res.status(500).json({ success: false, error: "Internal Server Error" });
    return res.status(500).send("-- [ERROR] Internal Server Error");
  }
}
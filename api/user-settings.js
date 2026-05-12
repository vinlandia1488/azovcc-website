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
      const msg = "-- [ERROR] Server configuration error";
      return req.method === "POST" ? res.status(500).json({ success: false, error: msg }) : res.status(500).send(msg);
    }

    const client = createClient({
      appId,
      headers: { api_key: apiKey },
    });

    // 1. Determine username
    const parsedBody = typeof req.body === "string"
      ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
      : (req.body || {});

    const username = (req.query.username || parsedBody.username || "").trim();

    if (!username) {
      const msg = "-- [ERROR] Username required";
      return req.method === "POST" ? res.status(400).json({ success: false, error: msg }) : res.status(400).send(msg);
    }

    // 2. Find account
    let account = null;
    const filtered = await client.entities.Account.filter({ username });
    if (filtered && filtered.length > 0) {
      account = filtered[0];
    } else {
      const allAccounts = await client.entities.Account.filter({});
      account = (allAccounts || []).find(a =>
        String(a.username || "").toLowerCase() === username.toLowerCase()
      );
    }

    if (!account) {
      const msg = "-- [ERROR] User not found";
      return req.method === "POST" ? res.status(404).json({ success: false, error: msg }) : res.status(404).send(msg);
    }

    // 3. Handle POST (Save)
    if (req.method === "POST") {
      const updates = {};
      if (parsedBody.executor_mode !== undefined) {
        updates.executor_mode = Boolean(parsedBody.executor_mode);
        updates.is_executor = Boolean(parsedBody.executor_mode);
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

    // 4. Handle GET (Load)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    let output = `-- user settings: ${account.username}\n`;
    output += `executor_mode = ${account.executor_mode === true || account.is_executor === true ? "true" : "false"}\n`;
    output += `accent_color = "${account.accent_color || "#ef4444"}"\n`;
    output += `reveal_console = ${account.reveal_console === true ? "true" : "false"}\n`;

    return res.status(200).send(output);
  } catch (err) {
    console.error(err);
    const msg = "-- [ERROR] Internal Server Error";
    return req.method === "POST" ? res.status(500).json({ success: false, error: msg }) : res.status(500).send(msg);
  }
}
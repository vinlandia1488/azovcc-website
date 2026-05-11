import { createClient } from "@base44/sdk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
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

    const { username } = req.query;
    if (!username) {
      return res.status(400).send("-- [ERROR] Username required");
    }

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

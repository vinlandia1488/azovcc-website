import { createClient } from "@base44/sdk";

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

    const { id, key } = req.query;

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
        return res.status(200).send(Buffer.from(rows[0].selected_config_content || "").toString("base64"));
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

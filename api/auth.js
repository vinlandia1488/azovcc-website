import { createClient } from "@base44/sdk";

// Helper to normalize rows (Sync with src/lib/license-keys.js)
function normalize(row) {
  const rawKey = row?.key || row?.script_key || "";
  let internalKey = row?.internal_key || row?.internal_license || "";
  
  if (rawKey.includes("|")) {
    const parts = rawKey.split("|");
    internalKey = parts[0];
  } 
  else if (row?.note && row.note.includes("[IK:")) {
    const match = row.note.match(/\[IK:([^\]]+)\]/);
    if (match) internalKey = match[1];
  }

  return internalKey;
}

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'text/plain');

  try {
    const appId = process.env.VITE_BASE44_APP_ID;
    const apiKey = process.env.VITE_BASE44_API_KEY;

    if (!appId || !apiKey) {
      return res.status(500).send("W0VSUk9SXSBNaXNzaW5nIEJBNEU0IEVudiBWYXJz"); // Base64 for [ERROR] Missing env vars
    }

    const client = createClient({
      appId,
      headers: { api_key: apiKey },
    });

    const entity = client.entities.LicenseKey;
    const rows = typeof entity.list === 'function' 
        ? await entity.list("-created_date", 500) 
        : await entity.filter({});

    const activeInternalKeys = rows
      .filter(row => !row.used)
      .map(normalize)
      .filter(Boolean);

    if (activeInternalKeys.length === 0) {
      return res.status(200).send("W0VNUFRZXQ=="); // Base64 for [EMPTY]
    }

    const rawString = activeInternalKeys.join('\n');
    const obfuscated = Buffer.from(rawString).toString('base64');
    
    return res.status(200).send(obfuscated);
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).send("W0VSUk9SXSBGYWlsZWQgdG8gZmV0Y2gga2V5cw=="); // Base64 for [ERROR] Failed to fetch keys
  }
}

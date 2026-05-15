import { createClient } from "@base44/sdk";

const ALLOWED_ORIGINS = [
  "https://adderalcc.vercel.app",
  "https://adderalcc.com",
];

function normalize(row) {
  const rawKey = row?.key || row?.script_key || "";
  let internalKey = row?.internal_key || row?.internal_license || "";
  if (rawKey.includes("|")) {
    const parts = rawKey.split("|");
    internalKey = parts[0];
  } else if (row?.note && row.note.includes("[IK:")) {
    const match = row.note.match(/\[IK:([^\]]+)\]/);
    if (match) internalKey = match[1];
  }
  return internalKey;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    const appId = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
    const apiKey = process.env.BASE44_API_KEY || process.env.VITE_BASE44_API_KEY;

    if (!appId || !apiKey) {
      return res.status(500).send("W0VSUk9SXSBNaXNzaW5nIEJBNEU0IEVudiBWYXJz");
    }

    const client = createClient({
      appId,
      headers: { api_key: apiKey },
    });

    const entity = client.entities.LicenseKey;
    const rows =
      typeof entity.list === "function"
        ? await entity.list("-created_date", 500)
        : await entity.filter({});

    const activeInternalKeys = rows
      .filter((row) => !row.used)
      .map(normalize)
      .filter(Boolean);

    // Also fetch all assigned internal keys from user accounts
    const accountEntity = client.entities.Account;
    const accounts = 
      typeof accountEntity.list === "function"
        ? await accountEntity.list("-created_date", 500)
        : await accountEntity.filter({});
        
    const assignedKeys = (accounts || [])
      .map(a => {
        if (a.internal_license) return a.internal_license;
        if (a.license_key && a.license_key.includes('|+|')) {
           const parts = a.license_key.split('|+|');
           // The internal key is usually the first or second part depending on how it was saved.
           // In UserDetailModal we saved it as: key + '|+|' + script_license + ...
           return parts[0];
        }
        return null;
      })
      .filter(Boolean);

    const allKeys = [...new Set([...activeInternalKeys, ...assignedKeys])];

    if (allKeys.length === 0) {
      return res.status(200).send("W0VNUFRZXQ==");
    }

    const rawString = allKeys.join("\n");
    const obfuscated = Buffer.from(rawString).toString("base64");
    return res.status(200).send(obfuscated);
  } catch (err) {
    return res.status(500).send("W0VSUk9SXSBGYWlsZWQgdG8gZmV0Y2gga2V5cw==");
  }
}

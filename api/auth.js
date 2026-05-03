import { createClient } from "@base44/sdk";

const ALLOWED_ORIGINS = [
  "https://azovcc.vercel.app",
  "https://azovcc.com",
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

    if (activeInternalKeys.length === 0) {
      return res.status(200).send("W0VNUFRZXQ==");
    }

    const rawString = activeInternalKeys.join("\n");
    const obfuscated = Buffer.from(rawString).toString("base64");
    return res.status(200).send(obfuscated);
  } catch (err) {
    return res.status(500).send("W0VSUk9SXSBGYWlsZWQgdG8gZmV0Y2gga2V5cw==");
  }
}

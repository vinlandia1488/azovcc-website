import { createClient } from "@base44/sdk";

const SETTINGS_NAME = "__USER_SETTINGS__";

function safeBool(val, fallback = false) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const v = val.toLowerCase().trim();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function parseJsonOrEmpty(raw) {
  if (!raw || typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function findUserSettingsRow(client, username) {
  let rows = [];
  try {
    rows = await client.entities.CloudConfig.filter({ owner_username: username });
  } catch {}

  let row = (rows || []).find((r) => String(r.name || "") === SETTINGS_NAME);
  if (row) return row;

  const allRows = await client.entities.CloudConfig.filter({});
  row = (allRows || []).find(
    (r) =>
      String(r.owner_username || "").toLowerCase() === String(username || "").toLowerCase() &&
      String(r.name || "") === SETTINGS_NAME
  );
  return row || null;
}

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
    try {
      const filtered = await client.entities.Account.filter({ username });
      if (filtered && filtered.length > 0) account = filtered[0];
    } catch {}

    if (!account) {
      const allAccounts = await client.entities.Account.filter({});
      account = (allAccounts || []).find((a) =>
        String(a.username || "").toLowerCase() === username.toLowerCase()
      );
    }

    if (!account) {
      const msg = "-- [ERROR] User not found";
      return req.method === "POST" ? res.status(404).json({ success: false, error: msg }) : res.status(404).send(msg);
    }

    // 3. Handle POST (Save)
    if (req.method === "POST") {
      // Save toggles into CloudConfig (Account schema on Base44 may not include these fields)
      const existingRow = await findUserSettingsRow(client, username);
      const existing = existingRow ? parseJsonOrEmpty(existingRow.content) : {};

      const next = {
        ...existing,
      };

      if (parsedBody.executor_mode !== undefined) {
        next.executor_mode = safeBool(parsedBody.executor_mode, false);
      }
      if (parsedBody.reveal_console !== undefined) {
        next.reveal_console = safeBool(parsedBody.reveal_console, false);
      }
      if (parsedBody.accent_color !== undefined) {
        next.accent_color = String(parsedBody.accent_color);
        // Accent color is a real Account field, so keep it synced there too.
        try {
          await client.entities.Account.update(account.id, { accent_color: String(parsedBody.accent_color) });
        } catch {}
      }

      if (existingRow) {
        await client.entities.CloudConfig.update(existingRow.id, { content: JSON.stringify(next) });
      } else {
        await client.entities.CloudConfig.create({
          owner_username: username,
          name: SETTINGS_NAME,
          content: JSON.stringify(next),
        });
      }

      return res.status(200).json({ success: true, settings: next });
    }

    // 4. Handle GET (Load)
    const wantsJson =
      String(req.query.format || "").toLowerCase() === "json" ||
      String(req.headers.accept || "").toLowerCase().includes("application/json");

    const row = await findUserSettingsRow(client, username);
    const stored = row ? parseJsonOrEmpty(row.content) : {};

    const executorMode = stored.executor_mode === true;
    const revealConsole = stored.reveal_console === true;
    const accentColor = String(stored.accent_color || account.accent_color || "#ef4444");

    if (wantsJson) {
      return res.status(200).json({
        success: true,
        username: account.username,
        executor_mode: executorMode,
        reveal_console: revealConsole,
        accent_color: accentColor,
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    let output = `-- user settings: ${account.username}\n`;
    output += `executor_mode = ${executorMode ? "true" : "false"}\n`;
    output += `accent_color = "${accentColor}"\n`;
    output += `reveal_console = ${revealConsole ? "true" : "false"}\n`;
    return res.status(200).send(output);
  } catch (err) {
    console.error(err);
    const msg = "-- [ERROR] Internal Server Error";
    return req.method === "POST" ? res.status(500).json({ success: false, error: msg }) : res.status(500).send(msg);
  }
}

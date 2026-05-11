import { createClient } from "@base44/sdk";

export default async function handler(req, res) {
  // Set headers for raw plain text output
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { username } = req.query;

  if (!username) {
    return res.status(400).send("[ERROR] Username required");
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

    // Find the user by username
    const accounts = await client.entities.Account.filter({
      username: username
    });

    if (accounts && accounts.length > 0) {
      const acc = accounts[0];
      let content = acc.selected_config_content;

      // Fallback to default template if empty
      if (!content || content.trim() === "") {
        const templateRows = await client.entities.CloudConfig.filter({
          name: "__config_templates__",
          owner_username: "admin"
        });
        if (templateRows && templateRows.length > 0) {
          try {
            // Try parsing if it's JSON, otherwise use raw
            let rawTemplate = templateRows[0].content;
            try {
              const templates = JSON.parse(rawTemplate);
              content = templates.defaultCloudConfig || rawTemplate;
            } catch (e) {
              content = rawTemplate;
            }
          } catch (e) {
            content = "-- Error retrieving default template";
          }
        } else {
          content = "-- No config applied and no template found";
        }
      }

      // Return the RAW content, nothing else
      // If content is a URL, fetch the content of that URL
      if (content && (content.startsWith("http://") || content.startsWith("https://"))) {
        try {
          const fetchRes = await fetch(content);
          if (fetchRes.ok) {
            content = await fetchRes.text();
          }
        } catch (e) {
          console.error("Failed to fetch external config URL:", e);
        }
      }

      return res.status(200).send(content);
    }

    return res.status(404).send("[ERROR] User not found");
  } catch (err) {
    console.error(err);
    return res.status(500).send("[ERROR] Internal Server Error");
  }
}

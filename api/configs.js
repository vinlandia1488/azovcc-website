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
      
      // PRIORITY: Check if user has an active_config_id first
      if (acc.active_config_id) {
        const activeConfig = await client.entities.CloudConfig.get(acc.active_config_id);
        if (activeConfig && activeConfig.content) {
          let content = activeConfig.content;
          
          // Resolve URL if content is a link
          if (content.startsWith("http://") || content.startsWith("https://")) {
            try {
              const resFetch = await fetch(content);
              if (resFetch.ok) content = await resFetch.text();
            } catch (e) {}
          }
          return res.status(200).send(content);
        }
      }

      // FALLBACK 1: Check selected_config_content (from handleRun/handleSave)
      let content = acc.selected_config_content;

      // FALLBACK 2: Default template if everything else is empty
      if (!content || content.trim() === "") {
        const templateRows = await client.entities.CloudConfig.filter({
          name: "__config_templates__",
          owner_username: "admin"
        });
        if (templateRows && templateRows.length > 0) {
          try {
            let rawTemplate = templateRows[0].content;
            
            // If the template content is a URL, fetch it first
            if (rawTemplate && (rawTemplate.startsWith("http://") || rawTemplate.startsWith("https://"))) {
              const fetchRes = await fetch(rawTemplate);
              if (fetchRes.ok) {
                rawTemplate = await fetchRes.text();
              }
            }

            // Try to parse the template as JSON to get the specific "defaultCloudConfig" field
            try {
              const templates = JSON.parse(rawTemplate);
              content = templates.defaultCloudConfig || rawTemplate;
            } catch (e) {
              // If it's not JSON, just use the raw text
              content = rawTemplate;
            }
          } catch (e) {
            content = "-- Error retrieving default template";
          }
        } else {
          content = "-- No config applied and no template found";
        }
      }

      // Final step: If the final content is a URL, fetch it one last time
      if (content && (content.startsWith("http://") || content.startsWith("https://"))) {
        try {
          const finalFetch = await fetch(content);
          if (finalFetch.ok) {
            content = await finalFetch.text();
          }
        } catch (e) {}
      }

      // Return the RAW content as clean Lua
      return res.status(200).send(content);
    }

    return res.status(404).send("[ERROR] User not found");
  } catch (err) {
    console.error(err);
    return res.status(500).send("[ERROR] Internal Server Error");
  }
}

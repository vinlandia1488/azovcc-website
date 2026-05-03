const appId = "69e5c33e8412f03b6383813f";
const apiKey = "b253be29e6874020a3916e8d1c6eea70";

async function run() {
    const url = `https://base44.app/api/apps/${appId}/entities/Account`;
    const res = await fetch(url, { 
        method: 'POST',
        headers: { 
            'api_key': apiKey, 
            'X-App-Id': appId,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: "test_discord_user",
            password_hash: "123",
            discord_id: "999888777",
            discord_username: "TestDiscord",
            discord_avatar: "abc123def456"
        })
    });
    const data = await res.json();
    console.log(data);
}
run();

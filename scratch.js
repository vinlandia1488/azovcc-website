import fs from 'fs';

const appId = "69e5c33e8412f03b6383813f";
const apiKey = "b253be29e6874020a3916e8d1c6eea70";

async function run() {
    const schemaContent = fs.readFileSync('entities/Account', 'utf8');
    const schema = JSON.parse(schemaContent);

    // Some BaaS use POST to /schema or /entities
    const url = `https://base44.app/api/apps/${appId}/entities`;
    const res = await fetch(url, { 
        method: 'POST',
        headers: { 
            'api_key': apiKey, 
            'X-App-Id': appId,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: "Account", schema: schema })
    });
    
    console.log("Status:", res.status);
    try {
        const data = await res.json();
        console.log("Data:", data);
    } catch(e) {
        console.log("Response text:", await res.text());
    }
}
run();

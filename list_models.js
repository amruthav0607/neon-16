const https = require('https');

https.get('https://openrouter.ai/api/v1/models', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            const models = json.data.filter(m => m.id.includes('google'));
            console.log("All Google Models:");
            models.forEach(m => console.log(`- ${m.id} (Price: ${m.pricing.prompt})`));
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});

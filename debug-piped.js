const https = require('https');

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'Invalid JSON', raw: data });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ error: 'Timeout' });
        });
    });
}

async function testPiped(videoId) {
    console.log(`\nTesting Piped API for: ${videoId}`);
    const instance = 'https://pipedapi.kavin.rocks';
    const url = `${instance}/streams/${videoId}`;

    console.log(`Fetching: ${url}`);
    const data = await fetchJson(url);

    if (data.subtitles) {
        console.log(`Found ${data.subtitles.length} subtitles.`);
        const sub = data.subtitles.find(s => s.code === 'en') || data.subtitles[0];
        console.log(`Selected subtitle: ${sub.name} (${sub.code})`);
        console.log(`URL: ${sub.url}`);
    } else {
        console.error('No subtitles found or API error:', data.error || 'Unknown error');
    }
}

async function run() {
    await testPiped('HndV87XpkWg');
}

run();

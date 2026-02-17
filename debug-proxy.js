const https = require('https');

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'Invalid JSON', raw: data });
                }
            });
        }).on('error', reject);
    });
}

async function testProxy(videoId) {
    console.log(`Testing Invidious Proxy for: ${videoId}`);
    // Using a known reliable instance
    const instance = 'https://inv.tux.pizza';
    const url = `${instance}/api/v1/captions/${videoId}`;

    console.log(`Fetching: ${url}`);
    const data = await fetchJson(url);

    if (data.captions) {
        console.log(`Found ${data.captions.length} caption tracks.`);
        const track = data.captions.find(c => c.languageCode === 'en') || data.captions[0];
        console.log(`Selected track: ${track.label} (${track.languageCode})`);

        // Fetch actual content
        const contentUrl = `${instance}${track.url}`;
        console.log(`Fetching content from: ${contentUrl}`);

        // Invidious returns VTT, we might need to parse or just dump it
        // Simulating fetch of VTT
        https.get(contentUrl, (res) => {
            let vtt = '';
            res.on('data', c => vtt += c);
            res.on('end', () => {
                console.log('VTT Content Length:', vtt.length);
                console.log('First 100 chars:', vtt.substring(0, 100));
            });
        });

    } else {
        console.error('No captions found or API error:', data);
    }
}

testProxy('HndV87XpkWg');

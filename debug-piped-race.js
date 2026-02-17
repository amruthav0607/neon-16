const https = require('https');

const instances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.otter.sh',
    'https://piped-api.garudalinux.org',
    'https://pa.il.ax',
    'https://api.piped.privacy.com.de'
];

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function testInstance(instance, videoId) {
    console.log(`Testing: ${instance}`);
    try {
        const data = await fetchJson(`${instance}/streams/${videoId}`);
        if (data.subtitles && data.subtitles.length > 0) {
            console.log(`SUCCESS: ${instance} found ${data.subtitles.length} subtitles.`);
            return instance;
        } else {
            console.log(`FAIL: ${instance} returned no subtitles.`);
        }
    } catch (e) {
        console.log(`FAIL: ${instance} - ${e.message}`);
    }
    return null;
}

async function race() {
    const videoId = 'HndV87XpkWg';
    const promises = instances.map(i => testInstance(i, videoId));

    // We want to see all results really, to pick the best one or all working ones
    await Promise.all(promises);
}

race();

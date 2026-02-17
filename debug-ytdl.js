const ytdl = require('@distube/ytdl-core');
const https = require('https');

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        https.get(url, options, (res) => {
            console.log('Fetch Status:', res.statusCode);
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function testTranscript(videoId) {
    console.log(`Testing @distube/ytdl-core for video: ${videoId}`);
    try {
        const info = await ytdl.getInfo(videoId);
        const tracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (tracks && tracks.length > 0) {
            console.log('Found tracks:', tracks.length);
            // Find English track
            const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
            console.log(`Selected track: ${track.name.simpleText} (${track.languageCode})`);

            // Try fetching as JSON
            const jsonUrl = track.baseUrl + '&fmt=json3';
            // console.log('URL:', jsonUrl); // URL is too long, might clutter

            const jsonContent = await fetchUrl(jsonUrl);
            console.log('Content Length:', jsonContent.length);

            try {
                const parsed = JSON.parse(jsonContent);
                console.log('Successfully parsed JSON!');
                const events = parsed.events;
                if (events) {
                    console.log('Event count:', events.length);
                    const firstText = events[0]?.segs?.[0]?.utf8;
                    console.log('First segment:', firstText);
                }
            } catch (e) {
                console.log('Failed to parse JSON:', e.message);
                console.log('First 100 chars raw:', jsonContent.substring(0, 100));
            }

        } else {
            console.log('No caption tracks found.');
        }

    } catch (error) {
        console.error('FAILED:', error.message);
    }
}

async function run() {
    await testTranscript('HndV87XpkWg'); // User
}

run();

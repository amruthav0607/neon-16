const fetch = require('node-fetch');

async function testApi() {
    try {
        const response = await fetch('http://localhost:3000/api/ai/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videoUrl: 'https://www.youtube.com/watch?v=HndV87XpkWg' // The video causing issues
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (data.requiresManualInput) {
            console.log('PARTIAL SUCCESS: API returned `requiresManualInput` (Fallback active).');
        } else if (data.summary || data.videoTitle) {
            console.log('SUCCESS: API returned summary/notes! yt-dlp worked.');
        } else if (data.error) {
            console.log('FAILURE: API returned error:', data.error);
        } else {
            console.log('UNCERTAIN: Received unknown response.');
        }

    } catch (error) {
        console.error('Connection Failed:', error.message);
        console.log('Is the server running on localhost:3000?');
    }
}

testApi();

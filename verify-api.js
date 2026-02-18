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
            console.log('SUCCESS: API is returning `requiresManualInput` flag.');
        } else if (data.error && data.error.includes('lacking captions')) {
            console.log('FAILURE: API is returning OLD error message. Server is stale.');
        } else {
            console.log('UNCERTAIN: Received error but not the expected flag or old message.');
        }

    } catch (error) {
        console.error('Connection Failed:', error.message);
        console.log('Is the server running on localhost:3000?');
    }
}

testApi();

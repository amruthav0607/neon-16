const ytdl = require('@distube/ytdl-core');

async function testVideo(videoId) {
    console.log(`Testing video: ${videoId}`);
    try {
        const info = await ytdl.getInfo(videoId);
        console.log('Success getting video info!');

        const tracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks) {
            console.log(`Found ${tracks.length} caption tracks.`);
            console.log('Tracks:', tracks.map(t => `${t.name.simpleText} (${t.languageCode})`).join(', '));
        } else {
            console.log('No captions found in player_response.');
        }

    } catch (error) {
        console.error('\n--- ERROR DETAILS ---');
        console.error('Message:', error.message);
        console.error('Status Code:', error.statusCode);
        // console.error('Full Error:', error);
    }
}

// User's video
testVideo('HndV87XpkWg');

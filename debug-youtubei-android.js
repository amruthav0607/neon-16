const { Innertube } = require('youtubei.js');

async function testTranscript(videoId) {
    console.log(`Testing youtubei.js (ANDROID client) for video: ${videoId}`);
    try {
        const youtube = await Innertube.create({
            client_type: 'ANDROID'
        });

        const info = await youtube.getInfo(videoId);
        try {
            const transcriptData = await info.getTranscript();
            console.log('Transcript method returned success.');
            console.log('Keys:', Object.keys(transcriptData || {}));

            if (transcriptData.transcript) {
                console.log('Found transcript property.');
                const content = transcriptData.transcript.content;
                if (content && content.body && content.body.initial_segments) {
                    console.log('Found segments:', content.body.initial_segments.length);
                    console.log('First segment:', content.body.initial_segments[0].snippet.text);
                } else {
                    console.log('Content structure mismatch:', content);
                }
            } else {
                console.log('No transcript property found in data.');
            }
        } catch (e) {
            console.log('getTranscript() threw error:', e.message);
        }

    } catch (error) {
        console.error('FAILED:', error.message);
    }
}

testTranscript('HndV87XpkWg');

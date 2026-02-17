const { Innertube } = require('youtubei.js');

async function testTranscript(videoId) {
    console.log(`Testing youtubei.js for video: ${videoId}`);
    try {
        const youtube = await Innertube.create();
        const info = await youtube.getInfo(videoId);
        const transcriptData = await info.getTranscript();

        console.log('Success!');
        if (transcriptData && transcriptData.transcript) {
            const lines = transcriptData.transcript.content.body.initial_segments.map(s => s.snippet.text);
            console.log('Transcript length (lines):', lines.length);
            console.log('First 3 lines:', lines.slice(0, 3));
        } else {
            console.log('Transcript object structure might be different:', Object.keys(transcriptData || {}));
        }

    } catch (error) {
        console.error('FAILED:', error);
    }
}

// Control: Me at the zoo
testTranscript('jNQXAC9IVRw');

// User Video ID
testTranscript('HndV87XpkWg');

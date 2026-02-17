const { YoutubeTranscript } = require('youtube-transcript');

async function testTranscript(input, label) {
    console.log(`\n--- Testing ${label} ---`);
    console.log(`Input: ${input}`);
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(input);
        console.log('Success!');
        console.log('Transcript length:', transcript.length);
        if (transcript.length > 0) {
            console.log('First line:', transcript[0]);
        }
    } catch (error) {
        console.error('FAILED:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
    }
}

async function run() {
    // 1. Control: Me at the zoo (Should always work if library is good)
    await testTranscript('jNQXAC9IVRw', 'Control (Me at the zoo)');

    // 2. User Video ID
    await testTranscript('HndV87XpkWg', 'User Video ID');

    // 3. User Full URL
    await testTranscript('https://youtu.be/HndV87XpkWg?si=qJL0mpOMMcJnBHNK', 'User Full URL');
}

run();

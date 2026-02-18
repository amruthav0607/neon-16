const ytdl = require('yt-dlp-exec');

async function test() {
    try {
        console.log('Testing yt-dlp...');
        const output = await ytdl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            skipDownload: true
        });
        console.log('Success! Title:', output.title);
        console.log('Captions found:', !!(output.automatic_captions || output.subtitles));
        if (output.automatic_captions) console.log('Auto captions keys:', Object.keys(output.automatic_captions));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();

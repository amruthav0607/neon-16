import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Client contexts to try — some work better from cloud IPs
const INNERTUBE_CLIENTS = [
    {
        name: 'WEB',
        context: {
            client: {
                clientName: 'WEB',
                clientVersion: '2.20240530.00.00',
                hl: 'en',
                gl: 'US',
            },
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
    {
        name: 'ANDROID',
        context: {
            client: {
                clientName: 'ANDROID',
                clientVersion: '19.02.39',
                androidSdkVersion: 34,
                hl: 'en',
                gl: 'US',
            },
        },
        userAgent: 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
    },
    {
        name: 'TV_EMBEDDED',
        context: {
            client: {
                clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
                clientVersion: '2.0',
                hl: 'en',
                gl: 'US',
            },
            thirdParty: {
                embedUrl: 'https://www.google.com',
            },
        },
        userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
];

/**
 * Fetch transcript using YouTube's Innertube Player API with multiple client contexts.
 * Tries each client context until one succeeds.
 */
async function fetchTranscript(videoId: string): Promise<{ transcript: string; title: string }> {
    const errors: string[] = [];

    // Strategy 1: Try each Innertube client context
    for (const client of INNERTUBE_CLIENTS) {
        try {
            const result = await fetchViaInnertube(videoId, client);
            if (result.transcript.length > 50) {
                console.log(`✅ Transcript via Innertube (${client.name}), length: ${result.transcript.length}`);
                return result;
            }
        } catch (e: any) {
            console.warn(`Innertube ${client.name} failed:`, e.message);
            errors.push(`${client.name}: ${e.message}`);
        }
    }

    // Strategy 2: Direct timedtext API
    try {
        const result = await fetchViaTimedText(videoId);
        if (result.transcript.length > 50) {
            console.log(`✅ Transcript via timedtext API, length: ${result.transcript.length}`);
            return result;
        }
    } catch (e: any) {
        console.warn('Timedtext API failed:', e.message);
        errors.push(`timedtext: ${e.message}`);
    }

    // Strategy 3: Page scrape with consent bypass
    try {
        const result = await fetchViaPageScrape(videoId);
        if (result.transcript.length > 50) {
            console.log(`✅ Transcript via page scrape, length: ${result.transcript.length}`);
            return result;
        }
    } catch (e: any) {
        errors.push(`scrape: ${e.message}`);
    }

    // Strategy 4: NPM packages as final fallback
    try {
        const result = await fetchViaNpm(videoId);
        if (result.transcript.length > 50) {
            console.log(`✅ Transcript via NPM, length: ${result.transcript.length}`);
            return result;
        }
    } catch (e: any) {
        errors.push(`npm: ${e.message}`);
    }

    throw new Error(`All transcript strategies failed:\n${errors.join('\n')}`);
}

async function fetchViaInnertube(
    videoId: string,
    client: typeof INNERTUBE_CLIENTS[0]
): Promise<{ transcript: string; title: string }> {
    const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
            'X-YouTube-Client-Name': client.name === 'ANDROID' ? '3' : client.name === 'TV_EMBEDDED' ? '85' : '1',
            'X-YouTube-Client-Version': client.context.client.clientVersion,
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/',
        },
        body: JSON.stringify({
            videoId,
            context: client.context,
            contentCheckOk: true,
            racyCheckOk: true,
        }),
    });

    if (!response.ok) {
        throw new Error(`Player API HTTP ${response.status}`);
    }

    const data = await response.json();
    const title = data.videoDetails?.title || '';

    // Check playability
    if (data.playabilityStatus?.status === 'ERROR') {
        throw new Error(data.playabilityStatus.reason || 'Video unavailable');
    }

    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No caption tracks available');
    }

    // Find English track, fall back to any available
    const track = captionTracks.find((t: any) =>
        t.languageCode === 'en' || t.languageCode?.startsWith('en')
    ) || captionTracks[0];

    if (!track?.baseUrl) {
        throw new Error('No caption URL found');
    }

    // Add translation if not English
    let url = track.baseUrl;
    if (!track.languageCode?.startsWith('en')) {
        url += (url.includes('?') ? '&' : '?') + 'tlang=en';
    }
    // Request JSON3 format
    url += (url.includes('?') ? '&' : '?') + 'fmt=json3';

    const captionRes = await fetch(url, {
        headers: { 'User-Agent': client.userAgent },
    });

    if (!captionRes.ok) {
        // Try XML format instead
        const xmlUrl = url.replace('fmt=json3', 'fmt=srv3');
        const xmlRes = await fetch(xmlUrl, { headers: { 'User-Agent': client.userAgent } });
        const xmlText = await xmlRes.text();
        return { transcript: parseXmlCaptions(xmlText), title };
    }

    const captionText = await captionRes.text();

    // Try JSON3 parse
    try {
        const json = JSON.parse(captionText);
        if (json.events) {
            const transcript = json.events
                .filter((e: any) => e.segs)
                .map((e: any) => e.segs.map((s: any) => s.utf8 || '').join(''))
                .join(' ')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (transcript.length > 50) return { transcript, title };
        }
    } catch {
        // Try XML parse
        return { transcript: parseXmlCaptions(captionText), title };
    }

    throw new Error('Caption content was empty');
}

// Strategy 2: Direct timedtext API endpoint
async function fetchViaTimedText(videoId: string): Promise<{ transcript: string; title: string }> {
    // Try common timedtext URLs
    const urls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr`,
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                },
            });

            if (!res.ok) continue;

            const text = await res.text();
            if (!text || text.length < 10) continue;

            // Try JSON3
            try {
                const json = JSON.parse(text);
                if (json.events) {
                    const transcript = json.events
                        .filter((e: any) => e.segs)
                        .map((e: any) => e.segs.map((s: any) => s.utf8 || '').join(''))
                        .join(' ')
                        .replace(/\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (transcript.length > 50) return { transcript, title: '' };
                }
            } catch {
                // Try XML
                const transcript = parseXmlCaptions(text);
                if (transcript.length > 50) return { transcript, title: '' };
            }
        } catch {
            continue;
        }
    }

    throw new Error('All timedtext URLs failed');
}

// Strategy 3: Page scrape with consent bypass
async function fetchViaPageScrape(videoId: string): Promise<{ transcript: string; title: string }> {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&bpctr=9999999999&has_verified=1`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'CONSENT=PENDING+999',
        },
    });

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const title = titleMatch ? titleMatch[1] : '';

    // Find captionTracks
    const captionMatch = html.match(/"captionTracks"\s*:\s*(\[.*?\])/);
    if (!captionMatch) throw new Error('No captions in page HTML');

    const tracks = JSON.parse(captionMatch[1]);
    if (!tracks.length) throw new Error('Empty caption tracks');

    const track = tracks.find((t: any) =>
        t.languageCode === 'en' || t.vssId?.includes('.en')
    ) || tracks[0];

    if (!track?.baseUrl) throw new Error('No caption URL');

    let url = track.baseUrl;
    if (!track.languageCode?.startsWith('en')) {
        url += '&tlang=en';
    }

    const captionRes = await fetch(url);
    const captionXml = await captionRes.text();

    return { transcript: parseXmlCaptions(captionXml), title };
}

// Strategy 4: NPM packages
async function fetchViaNpm(videoId: string): Promise<{ transcript: string; title: string }> {
    const errors: string[] = [];

    try {
        const { fetchTranscript: ftPlus } = await import("youtube-transcript-plus");
        const result = await ftPlus(videoId);
        if (result?.length > 0) {
            const text = result.map((t: any) => t.text).join(" ");
            if (text.length > 50) return { transcript: text, title: '' };
        }
    } catch (e: any) { errors.push(e.message); }

    try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const result = await YoutubeTranscript.fetchTranscript(videoId);
        const text = result.map((t: any) => t.text).join(" ");
        if (text.length > 50) return { transcript: text, title: '' };
    } catch (e: any) { errors.push(e.message); }

    throw new Error(errors.join('; '));
}

// Parse YouTube XML captions to plain text
function parseXmlCaptions(xml: string): string {
    const segments = xml.match(/<text[^>]*>[\s\S]*?<\/text>/g);
    if (!segments?.length) throw new Error('No text segments in caption XML');

    return segments
        .map(s => s.replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, ' '))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { videoUrl } = await req.json();
        if (!videoUrl) {
            return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        console.log("Processing video:", videoId);

        // 1. Fetch transcript
        let transcriptText = "";
        let videoTitle = "";

        try {
            const result = await fetchTranscript(videoId);
            transcriptText = result.transcript;
            videoTitle = result.title || `YouTube Video ${videoId}`;
        } catch (e: any) {
            console.error("All transcript methods failed:", e.message);
            return NextResponse.json({
                error: "Failed to fetch transcript. The video might not have subtitles available.",
                details: e.message
            }, { status: 400 });
        }

        if (transcriptText.length < 50) {
            return NextResponse.json({ error: "Transcript is too short or empty." }, { status: 400 });
        }

        console.log("Transcript extracted, length:", transcriptText.length);

        // 2. AI Summarization
        console.log("Calling Groq for summarization...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert academic assistant. Summarize the following YouTube transcript.

RULES:
1. ALWAYS respond in ENGLISH, even if the transcript is in another language.
2. Return ONLY a valid JSON object with exactly two keys: "summary" and "studyNotes".
3. Both values MUST be JSON strings (wrapped in double quotes, with any internal quotes escaped as \\").
4. For studyNotes, use markdown formatting with ## headers, bullet points (- ), and **bold** for key terms.
5. Do NOT include any text outside the JSON object.

Example format:
{"summary": "A brief executive summary here.", "studyNotes": "## Topic\\n- Key point 1\\n- Key point 2"}`
                },
                {
                    role: "user",
                    content: `Summarize this transcript:\n${transcriptText.substring(0, 20000)}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        const rawContent = chatCompletion.choices[0]?.message?.content || '';
        if (!rawContent) throw new Error("AI returned empty content");

        // Robust JSON parsing
        let summary = "";
        let studyNotes = "";

        try {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const content = JSON.parse(jsonMatch[0]);
                summary = Array.isArray(content.summary) ? content.summary.join("\n") : (content.summary || "");
                studyNotes = Array.isArray(content.studyNotes) ? content.studyNotes.join("\n") : (content.studyNotes || "");
            }
        } catch {
            console.warn("JSON parse failed, using fallback extraction");
            const summaryMatch = rawContent.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (summaryMatch) summary = summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');

            const notesStart = rawContent.indexOf('"studyNotes"');
            if (notesStart !== -1) {
                let nc = rawContent.substring(notesStart + '"studyNotes"'.length);
                const qm = nc.match(/^\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (qm) {
                    studyNotes = qm[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                } else {
                    nc = nc.replace(/^\s*:\s*/, '').replace(/\}?\s*$/, '').trim();
                    if (nc.startsWith('"')) nc = nc.substring(1);
                    if (nc.endsWith('"')) nc = nc.slice(0, -1);
                    studyNotes = nc.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                }
            }

            if (!summary && !studyNotes) {
                summary = "See study notes for details.";
                studyNotes = rawContent;
            }
        }

        console.log("✅ AI summarization complete.");

        // 3. Save to DB
        const note = await prisma.youTubeNote.create({
            data: {
                videoUrl,
                videoTitle,
                summary: summary || "",
                studyNotes: studyNotes || "",
                userId: session.user.id as string,
            }
        });

        return NextResponse.json(note);

    } catch (error: any) {
        console.error("YouTube processing error:", error);
        return NextResponse.json({ error: error.message || "Failed to process video" }, { status: 500 });
    }
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

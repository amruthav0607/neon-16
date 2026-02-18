import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Pure JavaScript YouTube transcript extraction using YouTube's Innertube API.
 * This is the same method yt-dlp uses internally — no system binaries needed.
 * Works on Vercel serverless, local dev, and any Node.js environment.
 */
async function fetchTranscript(videoId: string): Promise<{ transcript: string; title: string }> {
    const errors: string[] = [];

    // Strategy 1: YouTube Innertube Player API (what yt-dlp uses internally)
    try {
        const result = await fetchViaInnertubeAPI(videoId);
        if (result.transcript.length > 50) {
            console.log("✅ Transcript via Innertube API, length:", result.transcript.length);
            return result;
        }
    } catch (e: any) {
        console.warn("Innertube API failed:", e.message);
        errors.push(`Innertube: ${e.message}`);
    }

    // Strategy 2: YouTube watch page scraping (extracts captionTracks from HTML)
    try {
        const result = await fetchViaPageScrape(videoId);
        if (result.transcript.length > 50) {
            console.log("✅ Transcript via page scrape, length:", result.transcript.length);
            return result;
        }
    } catch (e: any) {
        console.warn("Page scrape failed:", e.message);
        errors.push(`Scrape: ${e.message}`);
    }

    // Strategy 3: NPM packages as final fallback
    try {
        const result = await fetchViaNpm(videoId);
        if (result.transcript.length > 50) {
            console.log("✅ Transcript via NPM, length:", result.transcript.length);
            return result;
        }
    } catch (e: any) {
        errors.push(`NPM: ${e.message}`);
    }

    throw new Error(`All transcript strategies failed:\n${errors.join('\n')}`);
}

// Strategy 1: YouTube Innertube Player API
async function fetchViaInnertubeAPI(videoId: string): Promise<{ transcript: string; title: string }> {
    // Step 1: Get player response with caption track info
    const playerResponse = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
        },
        body: JSON.stringify({
            videoId: videoId,
            context: {
                client: {
                    clientName: 'ANDROID',
                    clientVersion: '19.02.39',
                    androidSdkVersion: 34,
                    hl: 'en',
                    gl: 'US',
                },
            },
        }),
    });

    if (!playerResponse.ok) {
        throw new Error(`Player API returned ${playerResponse.status}`);
    }

    const playerData = await playerResponse.json();
    const title = playerData.videoDetails?.title || '';

    // Step 2: Find caption tracks
    const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No caption tracks found in player response');
    }

    // Prefer English, fall back to first available
    const enTrack = captionTracks.find((t: any) =>
        t.languageCode === 'en' || t.languageCode?.startsWith('en')
    ) || captionTracks[0];

    if (!enTrack?.baseUrl) {
        throw new Error('No usable caption track URL found');
    }

    // Step 3: Fetch the caption XML with translation to English if needed
    let captionUrl = enTrack.baseUrl;
    if (enTrack.languageCode !== 'en' && !enTrack.languageCode?.startsWith('en')) {
        // Request translation to English
        captionUrl += '&tlang=en';
    }

    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();

    // Step 4: Parse XML transcript
    const transcript = parseXmlCaptions(captionXml);
    return { transcript, title };
}

// Strategy 2: Page scrape to extract captions
async function fetchViaPageScrape(videoId: string): Promise<{ transcript: string; title: string }> {
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    });
    const html = await pageResponse.text();

    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : '';

    // Extract captionTracks from ytInitialPlayerResponse
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) {
        throw new Error('No captionTracks found in page HTML');
    }

    let captionTracks;
    try {
        captionTracks = JSON.parse(captionMatch[1]);
    } catch {
        throw new Error('Failed to parse captionTracks JSON');
    }

    if (!captionTracks || captionTracks.length === 0) {
        throw new Error('captionTracks array is empty');
    }

    // Prefer English
    const enTrack = captionTracks.find((t: any) =>
        t.languageCode === 'en' || t.vssId?.includes('.en')
    ) || captionTracks[0];

    if (!enTrack?.baseUrl) {
        throw new Error('No caption baseUrl found');
    }

    let captionUrl = enTrack.baseUrl;
    if (enTrack.languageCode !== 'en') {
        captionUrl += '&tlang=en';
    }

    const captionResponse = await fetch(captionUrl);
    const captionXml = await captionResponse.text();
    const transcript = parseXmlCaptions(captionXml);

    return { transcript, title };
}

// Strategy 3: NPM packages
async function fetchViaNpm(videoId: string): Promise<{ transcript: string; title: string }> {
    const errors: string[] = [];

    try {
        const { fetchTranscript: ftPlus } = await import("youtube-transcript-plus");
        const result = await ftPlus(videoId);
        if (result && result.length > 0) {
            const text = result.map((t: any) => t.text).join(" ");
            if (text.length > 50) return { transcript: text, title: '' };
        }
    } catch (e: any) {
        errors.push(e.message);
    }

    try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const result = await YoutubeTranscript.fetchTranscript(videoId);
        const text = result.map((t: any) => t.text).join(" ");
        if (text.length > 50) return { transcript: text, title: '' };
    } catch (e: any) {
        errors.push(e.message);
    }

    throw new Error(errors.join('; '));
}

// Parse YouTube XML captions into plain text
function parseXmlCaptions(xml: string): string {
    const segments = xml.match(/<text[^>]*>[\s\S]*?<\/text>/g);
    if (!segments || segments.length === 0) {
        throw new Error('No text segments found in caption XML');
    }

    return segments
        .map(seg =>
            seg
                .replace(/<[^>]*>/g, '')          // remove XML tags
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/\n/g, ' ')
        )
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
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
        let videoTitle = `Analysis: ${videoId}`;

        try {
            const result = await fetchTranscript(videoId);
            transcriptText = result.transcript;
            if (result.title) videoTitle = result.title;
        } catch (e: any) {
            console.error("All transcript methods failed:", e.message);
            return NextResponse.json({
                error: "Failed to fetch transcript. The video might not have subtitles available.",
                details: e.message
            }, { status: 400 });
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({ error: "Transcript is too short or empty." }, { status: 400 });
        }

        console.log("Transcript extracted, length:", transcriptText.length);

        // 2. AI Summarization with Groq
        console.log("Calling Groq for summarization...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert academic assistant. Summarize the following YouTube transcript into an executive summary and detailed study notes. IMPORTANT: You MUST always write your response in ENGLISH, even if the transcript is in another language — translate and summarize into English. Return the result in JSON format with keys 'summary' and 'studyNotes'. Both 'summary' and 'studyNotes' MUST be strings in English. Use markdown formatting for studyNotes with headers, bullet points, and key takeaways."
                },
                {
                    role: "user",
                    content: `Transcript:\n${transcriptText.substring(0, 20000)}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const rawContent = chatCompletion.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error("AI returned empty content");
        }

        const content = JSON.parse(rawContent);
        const summary = Array.isArray(content.summary) ? content.summary.join("\n") : content.summary;
        const studyNotes = Array.isArray(content.studyNotes) ? content.studyNotes.join("\n") : content.studyNotes;

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

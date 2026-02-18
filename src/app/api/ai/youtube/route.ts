import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ==================== TRANSCRIPT EXTRACTION STRATEGIES ====================

/**
 * Master function: tries 6 strategies in order of reliability for Vercel/cloud deployment.
 * Piped & Invidious APIs are prioritized because they proxy through their own servers,
 * bypassing YouTube's IP blocking of cloud providers like AWS/Vercel.
 */
async function fetchTranscript(videoId: string): Promise<{ transcript: string; title: string }> {
    const errors: string[] = [];

    const strategies = [
        { name: 'Piped API', fn: () => fetchViaPipedAPI(videoId) },
        { name: 'Invidious API', fn: () => fetchViaInvidiousAPI(videoId) },
        { name: 'Innertube WEB', fn: () => fetchViaInnertube(videoId, 'WEB') },
        { name: 'Innertube ANDROID', fn: () => fetchViaInnertube(videoId, 'ANDROID') },
        { name: 'Page Scrape', fn: () => fetchViaPageScrape(videoId) },
        { name: 'NPM Packages', fn: () => fetchViaNpm(videoId) },
    ];

    for (const strategy of strategies) {
        try {
            const result = await strategy.fn();
            if (result.transcript && result.transcript.length > 50) {
                console.log(`✅ Transcript via ${strategy.name}, length: ${result.transcript.length}`);
                return result;
            }
        } catch (e: any) {
            console.warn(`${strategy.name} failed:`, e.message);
            errors.push(`${strategy.name}: ${e.message}`);
        }
    }

    throw new Error(`All 6 transcript strategies failed:\n${errors.join('\n')}`);
}

// ── Strategy 1: Piped API (proxy, not blocked by YouTube) ──────────────────
async function fetchViaPipedAPI(videoId: string): Promise<{ transcript: string; title: string }> {
    const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://pipedapi.adminforge.de',
        'https://api.piped.projectsegfau.lt',
    ];

    for (const instance of pipedInstances) {
        try {
            const res = await fetch(`${instance}/streams/${videoId}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(10000),
            });

            if (!res.ok) continue;

            const data = await res.json();
            const title = data.title || '';

            // Get subtitle tracks
            const subtitles = data.subtitles || [];
            if (subtitles.length === 0) continue;

            // Find English subtitles
            const enSub = subtitles.find((s: any) =>
                s.code === 'en' || s.code?.startsWith('en')
            ) || subtitles[0];

            if (!enSub?.url) continue;

            // Fetch the subtitle content
            let subUrl = enSub.url;
            // Request translation if not English
            if (!enSub.code?.startsWith('en') && !subUrl.includes('tlang=en')) {
                subUrl += (subUrl.includes('?') ? '&' : '?') + 'tlang=en';
            }

            const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(10000) });
            const subText = await subRes.text();

            // Parse (could be XML or VTT)
            const transcript = subText.includes('<text')
                ? parseXmlCaptions(subText)
                : parseVttCaptions(subText);

            if (transcript.length > 50) return { transcript, title };
        } catch {
            continue;
        }
    }

    throw new Error('All Piped instances failed');
}

// ── Strategy 2: Invidious API (proxy, not blocked by YouTube) ──────────────
async function fetchViaInvidiousAPI(videoId: string): Promise<{ transcript: string; title: string }> {
    const invidiousInstances = [
        'https://inv.nadeko.net',
        'https://invidious.nerdvpn.de',
        'https://invidious.privacyredirect.com',
        'https://vid.puffyan.us',
    ];

    for (const instance of invidiousInstances) {
        try {
            // Get video info for title
            const videoRes = await fetch(`${instance}/api/v1/videos/${videoId}?fields=title,captions`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(10000),
            });

            if (!videoRes.ok) continue;

            const videoData = await videoRes.json();
            const title = videoData.title || '';

            // Get captions
            const captions = videoData.captions || [];
            if (captions.length === 0) {
                // Try direct captions endpoint
                const capRes = await fetch(`${instance}/api/v1/captions/${videoId}`, {
                    signal: AbortSignal.timeout(10000),
                });
                if (!capRes.ok) continue;
                const capData = await capRes.json();
                if (!capData.captions?.length) continue;

                const enCap = capData.captions.find((c: any) =>
                    c.language_code === 'en' || c.label?.toLowerCase().includes('english')
                ) || capData.captions[0];

                if (!enCap?.label) continue;

                // Fetch caption content
                let capUrl = `${instance}/api/v1/captions/${videoId}?label=${encodeURIComponent(enCap.label)}`;
                if (!enCap.language_code?.startsWith('en')) {
                    capUrl += '&tlang=en';
                }

                const textRes = await fetch(capUrl, { signal: AbortSignal.timeout(10000) });
                const textContent = await textRes.text();
                const transcript = textContent.includes('<text')
                    ? parseXmlCaptions(textContent)
                    : parseVttCaptions(textContent);

                if (transcript.length > 50) return { transcript, title };
            } else {
                const enCap = captions.find((c: any) =>
                    c.language_code === 'en' || c.label?.toLowerCase().includes('english')
                ) || captions[0];

                let capUrl = `${instance}${enCap.url || `/api/v1/captions/${videoId}?label=${encodeURIComponent(enCap.label)}`}`;
                if (!enCap.language_code?.startsWith('en')) {
                    capUrl += (capUrl.includes('?') ? '&' : '?') + 'tlang=en';
                }

                const textRes = await fetch(capUrl, { signal: AbortSignal.timeout(10000) });
                const textContent = await textRes.text();
                const transcript = textContent.includes('<text')
                    ? parseXmlCaptions(textContent)
                    : parseVttCaptions(textContent);

                if (transcript.length > 50) return { transcript, title };
            }
        } catch {
            continue;
        }
    }

    throw new Error('All Invidious instances failed');
}

// ── Strategy 3 & 4: YouTube Innertube Player API ───────────────────────────
async function fetchViaInnertube(videoId: string, clientType: 'WEB' | 'ANDROID'): Promise<{ transcript: string; title: string }> {
    const clients: Record<string, any> = {
        WEB: {
            context: { client: { clientName: 'WEB', clientVersion: '2.20240530.00.00', hl: 'en', gl: 'US' } },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
            clientId: '1',
        },
        ANDROID: {
            context: { client: { clientName: 'ANDROID', clientVersion: '19.02.39', androidSdkVersion: 34, hl: 'en', gl: 'US' } },
            userAgent: 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
            clientId: '3',
        },
    };

    const client = clients[clientType];

    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
            'X-YouTube-Client-Name': client.clientId,
            'X-YouTube-Client-Version': client.context.client.clientVersion,
            'Origin': 'https://www.youtube.com',
        },
        body: JSON.stringify({ videoId, context: client.context, contentCheckOk: true, racyCheckOk: true }),
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const title = data.videoDetails?.title || '';
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) throw new Error('No captions');

    const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0];
    if (!track?.baseUrl) throw new Error('No caption URL');

    let url = track.baseUrl;
    if (!track.languageCode?.startsWith('en')) url += '&tlang=en';

    const capRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const capText = await capRes.text();

    return { transcript: parseXmlCaptions(capText), title };
}

// ── Strategy 5: YouTube page scrape with consent bypass ────────────────────
async function fetchViaPageScrape(videoId: string): Promise<{ transcript: string; title: string }> {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'CONSENT=PENDING+999',
        },
        signal: AbortSignal.timeout(15000),
    });

    const html = await res.text();
    const titleMatch = html.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const title = titleMatch ? titleMatch[1] : '';

    const capMatch = html.match(/"captionTracks"\s*:\s*(\[.*?\])/);
    if (!capMatch) throw new Error('No captions in HTML');

    const tracks = JSON.parse(capMatch[1]);
    const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0];
    if (!track?.baseUrl) throw new Error('No caption URL');

    let url = track.baseUrl;
    if (!track.languageCode?.startsWith('en')) url += '&tlang=en';

    const capRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return { transcript: parseXmlCaptions(await capRes.text()), title };
}

// ── Strategy 6: NPM packages ──────────────────────────────────────────────
async function fetchViaNpm(videoId: string): Promise<{ transcript: string; title: string }> {
    const errors: string[] = [];

    try {
        const { fetchTranscript: ft } = await import("youtube-transcript-plus");
        const result = await ft(videoId);
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

// ==================== PARSERS =============================================

function parseXmlCaptions(xml: string): string {
    const segments = xml.match(/<text[^>]*>[\s\S]*?<\/text>/g);
    if (!segments?.length) throw new Error('No text in XML');
    return segments
        .map(s => s.replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, ' '))
        .join(' ').replace(/\s+/g, ' ').trim();
}

function parseVttCaptions(vtt: string): string {
    return vtt.split('\n')
        .filter(line =>
            !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:') &&
            !line.match(/^\d{2}:\d{2}/) && !line.match(/^align:/) && !line.match(/^position:/) &&
            !line.match(/^\s*$/) && !line.match(/^NOTE/)
        )
        .map(line => line.replace(/<[^>]*>/g, ''))
        .join(' ').replace(/\s+/g, ' ').trim();
}

// ==================== API ROUTE ===========================================

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { videoUrl, transcript: manualTranscript } = await req.json();

        if (!videoUrl && !manualTranscript) {
            return NextResponse.json({ error: "Video URL or transcript text is required" }, { status: 400 });
        }

        let transcriptText = "";
        let videoTitle = "";
        let videoId = "";

        if (manualTranscript && manualTranscript.trim().length > 50) {
            transcriptText = manualTranscript.trim();
            videoId = videoUrl ? (extractVideoId(videoUrl) || 'manual') : 'manual';
            videoTitle = videoUrl ? `Video ${videoId}` : 'Manual Transcript Analysis';
            console.log("Using manually pasted transcript, length:", transcriptText.length);
        } else if (videoUrl) {
            videoId = extractVideoId(videoUrl) || '';
            if (!videoId) {
                return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
            }

            console.log("Processing video:", videoId);

            try {
                const result = await fetchTranscript(videoId);
                transcriptText = result.transcript;
                videoTitle = result.title || `YouTube Video ${videoId}`;
            } catch (e: any) {
                console.error("All transcript methods failed:", e.message);
                return NextResponse.json({
                    error: "Failed to fetch transcript. Try pasting the transcript manually using the 'Paste Transcript' tab.",
                    details: e.message
                }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: "Transcript text is too short. Please paste at least a few sentences." }, { status: 400 });
        }

        if (transcriptText.length < 50) {
            return NextResponse.json({ error: "Transcript is too short or empty." }, { status: 400 });
        }

        console.log("Transcript ready, length:", transcriptText.length);

        // AI Summarization
        console.log("Calling Groq...");
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
            console.warn("JSON parse failed, using fallback");
            const sm = rawContent.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (sm) summary = sm[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');

            const ns = rawContent.indexOf('"studyNotes"');
            if (ns !== -1) {
                let nc = rawContent.substring(ns + '"studyNotes"'.length);
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

        console.log("✅ Summarization complete.");

        const note = await prisma.youTubeNote.create({
            data: {
                videoUrl: videoUrl || `manual://${videoId}`,
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

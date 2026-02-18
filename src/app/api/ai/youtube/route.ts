import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Multi-strategy transcript fetcher for reliability
async function fetchTranscript(videoId: string, videoUrl: string): Promise<string> {
    const errors: string[] = [];

    // Strategy 1: youtube-transcript-plus (more robust)
    try {
        const { getTranscript } = await import("youtube-transcript-plus");
        const transcript = await getTranscript(videoId);
        if (transcript && transcript.length > 0) {
            const text = transcript.map((t: any) => t.text).join(" ");
            if (text.length > 50) {
                console.log("Transcript fetched via youtube-transcript-plus");
                return text;
            }
        }
    } catch (e: any) {
        console.warn("youtube-transcript-plus failed:", e.message);
        errors.push(`Strategy 1: ${e.message}`);
    }

    // Strategy 2: Original youtube-transcript package
    try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
        const text = transcript.map((t: any) => t.text).join(" ");
        if (text.length > 50) {
            console.log("Transcript fetched via youtube-transcript");
            return text;
        }
    } catch (e: any) {
        console.warn("youtube-transcript failed:", e.message);
        errors.push(`Strategy 2: ${e.message}`);
    }

    // Strategy 3: Direct fetch from YouTube's timedtext API
    try {
        const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        const pageHtml = await pageResponse.text();

        // Extract captions URL from page HTML
        const captionMatch = pageHtml.match(/"captionTracks":\s*\[(.*?)\]/);
        if (captionMatch) {
            const captionData = JSON.parse(`[${captionMatch[1]}]`);
            const enCaption = captionData.find((c: any) =>
                c.languageCode === 'en' || c.vssId?.includes('.en')
            ) || captionData[0]; // Fallback to first available language

            if (enCaption?.baseUrl) {
                const captionResponse = await fetch(enCaption.baseUrl);
                const captionXml = await captionResponse.text();

                // Parse XML captions
                const textSegments = captionXml.match(/<text[^>]*>(.*?)<\/text>/gs);
                if (textSegments && textSegments.length > 0) {
                    const text = textSegments
                        .map((s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
                        .join(" ")
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (text.length > 50) {
                        console.log("Transcript fetched via direct YouTube page scrape");
                        return text;
                    }
                }
            }
        }
        errors.push("Strategy 3: No captions found in page HTML");
    } catch (e: any) {
        console.warn("Direct YouTube fetch failed:", e.message);
        errors.push(`Strategy 3: ${e.message}`);
    }

    throw new Error(`All transcript strategies failed:\n${errors.join('\n')}`);
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

        console.log("Fetching transcript for video:", videoId);

        let transcriptText = "";
        try {
            transcriptText = await fetchTranscript(videoId, videoUrl);
        } catch (e: any) {
            console.error("All transcript methods failed:", e.message);
            return NextResponse.json({
                error: "Failed to fetch transcript. The video might not have subtitles, or YouTube blocked the request. Try a different video.",
                details: e.message
            }, { status: 400 });
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({ error: "Transcript is too short or empty." }, { status: 400 });
        }

        console.log("Transcript extracted, length:", transcriptText.length);

        // 2. AI Summarization with Groq SDK
        console.log("Calling Groq for summarization...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert academic assistant. Summarize the following YouTube transcript into an executive summary and detailed study notes. Return the result in JSON format with keys 'summary' and 'studyNotes'. Both 'summary' and 'studyNotes' MUST be strings. Use markdown for studyNotes."
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

        // Ensure summary and studyNotes are strings (AI might return array)
        const summary = Array.isArray(content.summary) ? content.summary.join("\n") : content.summary;
        const studyNotes = Array.isArray(content.studyNotes) ? content.studyNotes.join("\n") : content.studyNotes;

        console.log("AI summarization complete.");

        // 3. Save to DB
        const note = await prisma.youTubeNote.create({
            data: {
                videoUrl,
                videoTitle: `Analysis: ${videoId}`,
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

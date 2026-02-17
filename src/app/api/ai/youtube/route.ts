import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";
import ytdl from "@distube/ytdl-core";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { videoUrl, manualTranscript } = await req.json();

        if (!videoUrl) {
            return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        let transcriptText = manualTranscript || "";

        if (!transcriptText) {
            console.log("Fetching transcript using @distube/ytdl-core for:", videoId);
            try {
                // 1. Get Video Info with Cookies (if available)
                const agentOptions: any = {};
                if (process.env.YOUTUBE_COOKIES) {
                    try {
                        const cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
                        agentOptions.cookies = cookies;
                        console.log("Using provided YouTube cookies.");
                    } catch (e) {
                        console.warn("Failed to parse YOUTUBE_COOKIES:", e);
                    }
                }

                const agent = ytdl.createAgent(Array.isArray(agentOptions.cookies) ? agentOptions.cookies : undefined);
                const info = await ytdl.getInfo(videoUrl, { agent });
                const tracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;

                if (!tracks || tracks.length === 0) {
                    throw new Error("No captions found for this video.");
                }

                // 2. Find English or fallback to first
                // Logic: Try exact 'en' -> Try 'en-*' (e.g. en-US) -> Fallback to first available
                const track = tracks.find((t: any) => t.languageCode === 'en')
                    || tracks.find((t: any) => t.languageCode?.startsWith('en'))
                    || tracks[0];

                console.log(`Selected track: ${track.name.simpleText} (${track.languageCode})`);

                // 3. Fetch Transcript JSON
                const response = await fetch(`${track.baseUrl}&fmt=json3`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch transcript content: ${response.statusText}`);
                }

                const json = await response.json();

                // 4. Parse JSON events
                if (json.events) {
                    transcriptText = json.events
                        .map((e: any) => e.segs ? e.segs.map((s: any) => s.utf8).join('') : '')
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                }

            } catch (e: any) {
                console.error("Transcript fetch error:", e);
                // Return specific error to client to trigger manual input UI
                return NextResponse.json({
                    error: "Failed to fetch transcript. Video might be restricted.",
                    details: e.message,
                    requiresManualInput: true
                }, { status: 400 });
            }
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({ error: "Transcript is too short or empty." }, { status: 400 });
        }

        console.log("Transcript ready, length:", transcriptText.length);

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

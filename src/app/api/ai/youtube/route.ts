import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";
import ytdl from "yt-dlp-exec";

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
            console.log("Fetching transcript using yt-dlp for:", videoId);
            try {
                // Use yt-dlp to dump JSON info including subtitles
                const output = await ytdl(videoUrl, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCheckCertificates: true,
                    preferFreeFormats: true,
                    skipDownload: true, // We only want metadata/subs
                    // writeAutoSub: true, // REMOVED: causes file write error on Vercel
                    // writeSub: true,     // REMOVED: causes file write error on Vercel
                    subLang: 'en,en-US,en-GB', // Prefer English
                });

                // yt-dlp returns the full video info object
                // We need to parse the requested subtitles or automatic captions

                // Helper to extract caption text from the nested structure
                // Note: yt-dlp structure for captions can be complex. 
                // Often it's easier to use `write-auto-sub` and read the file, 
                // BUT for a Vercel/Serverless environment, file systems are ephemeral/readonly.
                // 
                // A better approach for the API is to use the `getTranscript` capability if available via the wrapper,
                // OR simpler: use `yt-dlp` to get the *automatic_captions* URL and fetch it.

                const captions = output.automatic_captions || output.subtitles;

                let captionUrl = null;
                const preferredLangs = ['en', 'en-US', 'en-GB', 'en-orig'];

                // Try to find a valid English caption URL
                if (captions) {
                    for (const lang of preferredLangs) {
                        if (captions[lang]) {
                            // Find 'json3' format for easier parsing, or 'vtt'
                            const track = captions[lang].find((c: any) => c.ext === 'json3')
                                || captions[lang].find((c: any) => c.ext === 'json3');

                            if (track) {
                                captionUrl = track.url;
                                break;
                            }
                        }
                    }
                    // Fallback to first available English if no json3 found
                    if (!captionUrl && captions['en']) {
                        captionUrl = captions['en'][0].url;
                    }
                }

                if (!captionUrl) {
                    throw new Error("No English captions found (checked automatic & manual).");
                }

                console.log("Found caption URL, fetching...");
                const response = await fetch(captionUrl);
                if (!response.ok) throw new Error("Failed to fetch caption file");

                // If it's json3, we parse it. If it's VTT/SRT (from fallback), we might need parsing.
                // Assuming json3 for now as we prioritized it.
                // If URL doesn't look like json3, we might receive XML or VTT.
                // For robustness, let's assume we grabbed the standard YouTube JSON format if we used the standard scraping logic,
                // but yt-dlp gives us the direct file URL.

                const text = await response.text();

                // Simple check if it's JSON
                if (text.trim().startsWith('{')) {
                    const json = JSON.parse(text);
                    if (json.events) {
                        transcriptText = json.events
                            .map((e: any) => e.segs ? e.segs.map((s: any) => s.utf8).join('') : '')
                            .join(' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                    }
                } else {
                    // It might be VTT/XML.
                    // Fallback: simple regex strip tags (crude but often enough for summary)
                    transcriptText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                }

            } catch (e: any) {
                console.error("Transcript fetch error:", e);
                // Return specific error to client to trigger manual input UI
                return NextResponse.json({
                    error: "Failed to fetch transcript (yt-dlp). Video might be restricted.",
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

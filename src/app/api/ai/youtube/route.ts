import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";
import { YoutubeTranscript } from "youtube-transcript";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

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
            const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
            transcriptText = transcript.map(t => t.text).join(" ");
        } catch (e: any) {
            console.error("youtube-transcript error:", e);
            return NextResponse.json({
                error: "Failed to fetch transcript. The video might not have English subtitles or extraction was blocked by YouTube.",
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

        // 3. Save to DB (Optional, but we'll return it directly)
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

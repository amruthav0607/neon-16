import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, mkdir, rm, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// yt-dlp: download subtitles to temp dir, read, parse, cleanup
async function fetchTranscriptWithYtDlp(videoUrl: string): Promise<string> {
    const tempDir = join(tmpdir(), `yt_subs_${randomUUID()}`);

    try {
        await mkdir(tempDir, { recursive: true });

        // Download subtitles (try manual subs first, then auto-generated)
        await execAsync(
            `yt-dlp --skip-download --write-sub --write-auto-sub --sub-lang "en.*,en" --sub-format vtt -o "${join(tempDir, 'sub')}" "${videoUrl}"`,
            { timeout: 30000 }
        );

        // Find the downloaded .vtt file
        const files = await readdir(tempDir);
        const vttFile = files.find(f => f.endsWith('.vtt'));

        if (!vttFile) {
            throw new Error("No subtitle file was downloaded — video may not have English captions");
        }

        const vttContent = await readFile(join(tempDir, vttFile), 'utf-8');

        // Parse VTT to plain text
        const text = vttContent
            .split('\n')
            .filter(line =>
                !line.startsWith('WEBVTT') &&
                !line.startsWith('Kind:') &&
                !line.startsWith('Language:') &&
                !line.match(/^\d{2}:\d{2}/) &&       // timestamp lines
                !line.match(/^align:/) &&
                !line.match(/^position:/) &&
                !line.match(/^\s*$/) &&                // empty lines
                !line.match(/^NOTE/)
            )
            .map(line => line.replace(/<[^>]*>/g, ''))  // strip HTML tags
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Deduplicate (VTT auto-subs often repeat lines)
        const words = text.split(' ');
        const deduped: string[] = [];
        for (let i = 0; i < words.length; i++) {
            if (i < 3 || words[i] !== words[i - 1] || words[i] !== words[i - 2]) {
                deduped.push(words[i]);
            }
        }

        return deduped.join(' ');
    } finally {
        // Cleanup temp dir
        await rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
}

// Get video title via yt-dlp
async function getVideoTitle(videoUrl: string): Promise<string> {
    try {
        const { stdout } = await execAsync(
            `yt-dlp --skip-download --print title "${videoUrl}"`,
            { timeout: 15000 }
        );
        return stdout.trim();
    } catch {
        return "";
    }
}

// NPM fallback
async function fetchTranscriptWithNpm(videoId: string, videoUrl: string): Promise<string> {
    const errors: string[] = [];

    try {
        const { fetchTranscript } = await import("youtube-transcript-plus");
        const transcript = await fetchTranscript(videoId);
        if (transcript && transcript.length > 0) {
            const text = transcript.map((t: any) => t.text).join(" ");
            if (text.length > 50) return text;
        }
    } catch (e: any) {
        errors.push(e.message);
    }

    try {
        const { YoutubeTranscript } = await import("youtube-transcript");
        const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
        const text = transcript.map((t: any) => t.text).join(" ");
        if (text.length > 50) return text;
    } catch (e: any) {
        errors.push(e.message);
    }

    throw new Error(`NPM methods failed: ${errors.join('; ')}`);
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
        const allErrors: string[] = [];

        // Strategy 1: yt-dlp (most reliable locally)
        try {
            transcriptText = await fetchTranscriptWithYtDlp(videoUrl);
            console.log("✅ Transcript via yt-dlp, length:", transcriptText.length);
        } catch (e: any) {
            console.warn("yt-dlp failed:", e.message);
            allErrors.push(`yt-dlp: ${e.message}`);

            // Strategy 2: NPM packages fallback (works on Vercel)
            try {
                transcriptText = await fetchTranscriptWithNpm(videoId, videoUrl);
                console.log("✅ Transcript via NPM fallback, length:", transcriptText.length);
            } catch (e2: any) {
                allErrors.push(`NPM: ${e2.message}`);
            }
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({
                error: "Failed to fetch transcript. The video might not have subtitles, or extraction was blocked.",
                details: allErrors.join('\n')
            }, { status: 400 });
        }

        // Get video title
        const videoTitle = await getVideoTitle(videoUrl) || `Analysis: ${videoId}`;

        // AI Summarization with Groq
        console.log("Calling Groq for summarization...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert academic assistant. Summarize the following YouTube transcript into an executive summary and detailed study notes. Return the result in JSON format with keys 'summary' and 'studyNotes'. Both 'summary' and 'studyNotes' MUST be strings. Use markdown formatting for studyNotes with headers, bullet points, and key takeaways."
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

        // Save to DB
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

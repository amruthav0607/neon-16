import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// yt-dlp based transcript extraction (most reliable)
async function fetchTranscriptWithYtDlp(videoUrl: string): Promise<string> {
    try {
        // Use yt-dlp to extract auto-generated or manual subtitles
        const { stdout } = await execAsync(
            `yt-dlp --skip-download --write-auto-sub --write-sub --sub-lang "en.*,en" --sub-format vtt --print-to-file "%(requested_subtitles)j" - -o - "${videoUrl}"`,
            { timeout: 30000 }
        );
        console.log("yt-dlp subtitle info:", stdout.substring(0, 200));
    } catch (e) {
        // Expected to fail on print, we'll use the direct approach instead
    }

    // Direct approach: extract subtitles as JSON
    try {
        const { stdout } = await execAsync(
            `yt-dlp --skip-download --write-auto-sub --write-sub --sub-lang "en.*,en" --sub-format json3 --dump-json "${videoUrl}"`,
            { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
        );

        const videoInfo = JSON.parse(stdout);

        // Check if subtitles are available
        const subtitles = videoInfo.subtitles || {};
        const autoSubs = videoInfo.automatic_captions || {};

        // Find English subtitles (manual first, then auto)
        let subUrl = "";
        const enKeys = Object.keys(subtitles).filter(k => k.startsWith('en'));
        const autoEnKeys = Object.keys(autoSubs).filter(k => k.startsWith('en'));

        if (enKeys.length > 0) {
            const formats = subtitles[enKeys[0]];
            const json3 = formats.find((f: any) => f.ext === 'json3') || formats.find((f: any) => f.ext === 'vtt') || formats[0];
            subUrl = json3?.url;
        } else if (autoEnKeys.length > 0) {
            const formats = autoSubs[autoEnKeys[0]];
            const json3 = formats.find((f: any) => f.ext === 'json3') || formats.find((f: any) => f.ext === 'vtt') || formats[0];
            subUrl = json3?.url;
        }

        if (subUrl) {
            const response = await fetch(subUrl);
            const subData = await response.text();

            // Try parsing as JSON3 format
            try {
                const json = JSON.parse(subData);
                if (json.events) {
                    const text = json.events
                        .filter((e: any) => e.segs)
                        .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
                        .join(' ')
                        .replace(/\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (text.length > 50) return text;
                }
            } catch {
                // Not JSON, try as VTT
                const text = subData
                    .replace(/WEBVTT[\s\S]*?\n\n/, '')
                    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/\n+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (text.length > 50) return text;
            }
        }

        // Fallback: try to get description if no subs
        if (videoInfo.description && videoInfo.description.length > 200) {
            console.log("No subtitles found, using video description as fallback");
            return `[Video Description - No subtitles available]\n${videoInfo.description}`;
        }

        throw new Error("No English subtitles or captions found for this video");
    } catch (e: any) {
        if (e.message?.includes("No English subtitles")) throw e;
        throw new Error(`yt-dlp failed: ${e.message}`);
    }
}

// Fallback: npm package based extraction
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

    throw new Error(`NPM transcript methods failed: ${errors.join('; ')}`);
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

        // Strategy 1: yt-dlp (most reliable)
        try {
            transcriptText = await fetchTranscriptWithYtDlp(videoUrl);
            console.log("✅ Transcript fetched via yt-dlp, length:", transcriptText.length);
        } catch (e: any) {
            console.warn("yt-dlp failed:", e.message);
            allErrors.push(`yt-dlp: ${e.message}`);

            // Strategy 2: NPM packages fallback
            try {
                transcriptText = await fetchTranscriptWithNpm(videoId, videoUrl);
                console.log("✅ Transcript fetched via NPM fallback, length:", transcriptText.length);
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

        console.log("Transcript extracted, length:", transcriptText.length);

        // 2. AI Summarization with Groq SDK
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

        console.log("AI summarization complete.");

        // 3. Get video title from yt-dlp
        let videoTitle = `Analysis: ${videoId}`;
        try {
            const { stdout } = await execAsync(`yt-dlp --skip-download --print title "${videoUrl}"`, { timeout: 10000 });
            videoTitle = stdout.trim() || videoTitle;
        } catch { /* keep default title */ }

        // 4. Save to DB
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

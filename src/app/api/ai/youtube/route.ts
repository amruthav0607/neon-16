import { db } from '@/lib/db';
import { youtubeNotes } from '@/lib/schema';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { videoUrl } = await request.json();
        if (!videoUrl) {
            return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }

        // Extract video ID from URL
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // 1. Fetch Transcript
        let transcriptText = '';
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map(t => t.text).join(' ');
        } catch (err) {
            console.error('Failed to fetch transcript:', err);
            return NextResponse.json({ error: 'Could not fetch transcript for this video. Please ensure captions are available.' }, { status: 400 });
        }

        if (transcriptText.length < 100) {
            return NextResponse.json({ error: 'Transcript too short to process.' }, { status: 400 });
        }

        // 2. Call OpenRouter AI
        const apiKey = process.env.OPENROUTER_API_KEY;
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-lite-preview-02-05:free",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert academic assistant. Your task is to summarize YouTube video transcripts and generate clean, structured study notes. Output should be JSON with 'summary' and 'studyNotes' fields. Use markdown for the studyNotes."
                    },
                    {
                        "role": "user",
                        "content": `Please summarize the following transcript and provide detailed study notes:\n\n${transcriptText.substring(0, 15000)}` // Limit to prevent token issues
                    }
                ],
                "response_format": { "type": "json_object" }
            })
        });

        const aiData = await response.json();
        const rawContent = aiData.choices[0].message.content;

        // Robust JSON parsing (handles markdown code blocks if the AI includes them)
        const content = parseAIJSON(rawContent);

        if (!content.summary || !content.studyNotes) {
            throw new Error('AI failed to generate required fields.');
        }

        const userIdNumerical = Number(session.user.id);
        if (isNaN(userIdNumerical)) {
            throw new Error(`Invalid user ID: ${session.user.id}`);
        }

        // 3. Save to Neon DB
        const [savedNote] = await db.insert(youtubeNotes).values({
            userId: userIdNumerical,
            videoUrl,
            videoTitle: `Video ${videoId}`,
            summary: content.summary,
            studyNotes: content.studyNotes,
        }).returning();

        return NextResponse.json(savedNote);
    } catch (error: any) {
        console.error('AI Processing error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}

function parseAIJSON(text: string) {
    try {
        // Try direct parse first
        return JSON.parse(text);
    } catch (e) {
        // Try extracting from markdown code blocks
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) {
                console.error("Failed to parse extracted JSON", match[1]);
            }
        }
        throw new Error("Could not parse AI response as JSON");
    }
}

function extractVideoId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

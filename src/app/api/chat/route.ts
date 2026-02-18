import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";
import { vectorSearch } from "@/lib/vector-store";
import { searchWeb } from "@/lib/firecrawl";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { workspaceId, question } = await req.json();

        if (!question) {
            return NextResponse.json({ error: "Missing question" }, { status: 400 });
        }

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
        }

        // 1. Vector Search
        console.log(`Searching workspace ${workspaceId} for: "${question}"`);
        const vectorResults = await vectorSearch(question, workspaceId);

        let context = "";
        let sources: any[] = [];
        let useWeb = false;

        // Threshold for relevance (lower is better for cosine distance)
        const bestScore = vectorResults.length > 0 ? vectorResults[0].metadata.score : 1;
        console.log("Vector Search Best Score:", bestScore);

        if (vectorResults.length > 0) {
            context += "--- WORKSPACE DOCUMENTS ---\n";
            vectorResults.forEach((r, i) => {
                context += `[${i + 1}] Document: ${r.metadata.documentName}\n${r.pageContent}\n\n`;
                sources.push({ type: 'document', name: r.metadata.documentName, id: r.metadata.documentId, content: r.pageContent });
            });
        }

        // 2. Web Search Fallback
        // If no results or poor relevance (> 0.5 distance approx), try web
        if (vectorResults.length === 0 || bestScore > 0.5) {
            console.log("Context insufficient, checking web...");
            useWeb = true;
            const webResults = await searchWeb(question);

            if (webResults.length > 0) {
                context += "--- WEB SEARCH RESULTS ---\n";
                webResults.forEach((r, i) => {
                    const citationIndex = sources.length + i + 1;
                    context += `[${citationIndex}] Web: ${r.title} (${r.url})\n${r.content.substring(0, 500)}...\n\n`;
                    sources.push({ type: 'web', title: r.title, url: r.url, content: r.content });
                });
            }
        }

        if (!context) {
            return NextResponse.json({ answer: "I couldn't find any relevant information in your workspace or on the web." });
        }

        console.log("Sending prompt to Groq...");

        const systemPrompt = `You are an AI research assistant.
Use the provided context to answer the user's question.
Always cite your sources using the [index] format provided in the context (e.g., [1], [2]).

If information comes from:
- Documents: Cite the document name.
- Web: Cite the URL.

If the answer cannot be found in the context, say so. Do not Hallucinate.

CONTEXT:
${context}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: question,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });

        const answer = chatCompletion.choices[0]?.message?.content || "No response generated.";

        return NextResponse.json({
            answer,
            sources
        });

    } catch (error: any) {
        console.error("Chat error:", error);
        return NextResponse.json({ error: "Failed to generate answer", details: error.message }, { status: 500 });
    }
}

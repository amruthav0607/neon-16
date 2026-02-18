import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchWeb } from "@/lib/firecrawl";
import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { query } = await req.json();

        if (!query || query.trim().length < 3) {
            return NextResponse.json({ error: "Please enter a search query" }, { status: 400 });
        }

        console.log("Deep Search query:", query);

        // 1. Search the web with Firecrawl
        const webResults = await searchWeb(query, 5);

        if (webResults.length === 0) {
            // If Firecrawl fails, still provide an AI answer
            console.warn("No web results from Firecrawl, generating answer from AI knowledge");
        }

        // 2. Build context from web results
        let context = "";
        const sources: any[] = [];

        webResults.forEach((r, i) => {
            context += `[${i + 1}] Source: ${r.title}\nURL: ${r.url}\nContent:\n${r.content.substring(0, 1500)}\n\n`;
            sources.push({
                index: i + 1,
                title: r.title,
                url: r.url,
                snippet: r.content.substring(0, 300).replace(/\n/g, ' ').trim(),
            });
        });

        // 3. Generate AI answer with Groq
        const systemPrompt = `You are a deep research assistant. Answer the user's question using the provided web search results.

RULES:
1. ALWAYS cite your sources using [1], [2], etc. matching the source indices.
2. Provide a thorough, well-structured answer using markdown formatting.
3. Use ## headers, **bold**, bullet points, and numbered lists.
4. At the end, suggest 3 follow-up questions the user might want to explore.
5. Format follow-up questions as a JSON array on the LAST line, prefixed with "FOLLOWUP:" like:
   FOLLOWUP:["Question 1?","Question 2?","Question 3?"]
6. If no web results were provided, answer from your own knowledge and note that web search was unavailable.

${context ? `WEB SEARCH RESULTS:\n${context}` : 'No web results available. Answer from your knowledge.'}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
        });

        const rawAnswer = chatCompletion.choices[0]?.message?.content || "No response generated.";

        // Extract follow-up questions
        let answer = rawAnswer;
        let followUpQuestions: string[] = [];

        const followUpMatch = rawAnswer.match(/FOLLOWUP:\s*(\[.*?\])\s*$/);
        if (followUpMatch) {
            try {
                followUpQuestions = JSON.parse(followUpMatch[1]);
                answer = rawAnswer.replace(/FOLLOWUP:\s*\[.*?\]\s*$/, '').trim();
            } catch {
                // Keep original answer if parsing fails
            }
        }

        console.log(`✅ Deep Search complete: ${sources.length} sources, ${answer.length} chars answer`);

        return NextResponse.json({
            answer,
            sources,
            followUpQuestions,
            query,
        });

    } catch (error: any) {
        console.error("Deep Search error:", error);
        return NextResponse.json({ error: error.message || "Search failed" }, { status: 500 });
    }
}

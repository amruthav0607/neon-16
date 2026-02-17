import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { documentId, question } = await req.json();

        if (!documentId || !question) {
            return NextResponse.json({ error: "Missing documentId or question" }, { status: 400 });
        }

        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
                userId: session.user.id as string,
            },
        });

        if (!document) {
            console.log("Document not found for ID:", documentId);
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        console.log("Document found, context length ready:", document.content.length);

        // Increased context length for "full content" reading
        const context = document.content.substring(0, 30000);

        console.log("Sending prompt to Groq with context slice...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant. Use the following document context to answer the user's question accurately. If the answer is not in the context, say that you don't know based on the document.\n\nDOCUMENT CONTEXT:\n${context}`
                },
                {
                    role: "user",
                    content: question,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });
        console.log("Groq response received.");

        return NextResponse.json({ answer: chatCompletion.choices[0]?.message?.content || "No response generated." });
    } catch (error: any) {
        console.error("Chat error:", error);
        if (error?.message?.includes("GROQ_API_KEY")) {
            return NextResponse.json({ error: "Groq API key is missing or invalid. Please check your .env file." }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }
}

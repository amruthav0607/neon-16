import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const count = await prisma.document.count();
        return NextResponse.json({
            status: "healthy",
            db_docs_count: count,
            env: {
                has_groq: !!process.env.GROQ_API_KEY,
                has_db: !!process.env.DATABASE_URL
            }
        });
    } catch (e: any) {
        return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
    }
}

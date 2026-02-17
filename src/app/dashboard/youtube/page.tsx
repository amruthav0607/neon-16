import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Youtube, Calendar, ExternalLink, BookOpen, FileText } from "lucide-react";
import YouTubeForm from "./YouTubeForm";

export default async function YouTubePage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white p-8 animate-in fade-in duration-700">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">AI Study Companion</h1>
                    <p className="text-gray-400">Transcribe, summarize, and learn from any YouTube video instantly.</p>
                </header>

                <YouTubeForm />
            </div>
        </div>
    );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Youtube } from "lucide-react";
import YouTubeForm from "./YouTubeForm";

export default async function YouTubePage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white px-4 py-6 sm:p-6 md:p-8 animate-in fade-in duration-700">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6 sm:mb-8 md:mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <Youtube className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 shrink-0" />
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">AI Study Companion</h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-400 ml-10 sm:ml-11">
                        Transcribe, summarize, and learn from any YouTube video instantly.
                    </p>
                </header>

                <YouTubeForm />
            </div>
        </div>
    );
}

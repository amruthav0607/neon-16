"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Zap, Loader2, AlertCircle } from "lucide-react";

export default function YouTubeForm() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const router = useRouter();

    const [manualTranscript, setManualTranscript] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/ai/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoUrl: url,
                    manualTranscript: showManualInput ? manualTranscript : undefined
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.requiresManualInput) {
                    setShowManualInput(true);
                    throw new Error("Unable to fetch transcript automatically. Please paste it manually below.");
                }
                throw new Error(data.error || "Failed to process video");
            }

            setResult(data);
            setUrl("");
            setManualTranscript("");
            setShowManualInput(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Youtube className="text-red-500 h-8 w-8" />
                Analyze New Video
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <input
                        type="url"
                        placeholder="Paste YouTube Video Link here (e.g., https://youtube.com/watch?v=...)"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            if (!showManualInput) setError(null);
                        }}
                        required
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                </div>

                {showManualInput && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">
                            Manual Transcript (Required for this video)
                        </label>
                        <textarea
                            placeholder="Paste the full transcript text here..."
                            value={manualTranscript}
                            onChange={(e) => setManualTranscript(e.target.value)}
                            required
                            rows={8}
                            className="w-full px-6 py-5 bg-white/5 border border-red-500/30 rounded-2xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2 ml-1">
                            Tip: On YouTube, click <strong>... More</strong> &gt; <strong>Show Transcript</strong> &gt; <strong>Toggle timestamps</strong> &gt; Copy all text.
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all transform hover:scale-[1.01] active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>AI is processing video...</span>
                        </>
                    ) : (
                        <>
                            <Zap className="h-5 w-5" />
                            Generate Study Notes
                        </>
                    )}
                </button>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <p className="text-sm font-medium text-red-400 uppercase tracking-tighter">{error}</p>
                    </div>
                )}
            </form>

            {result && (
                <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Zap className="h-5 w-5 text-blue-400" />
                            Latest Analysis
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Executive Summary</h4>
                            <p className="text-gray-300 leading-relaxed text-sm bg-white/5 p-6 rounded-2xl border border-white/5">
                                {result.summary}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Structured Study Notes</h4>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 h-full">
                                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none">
                                    {result.studyNotes}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

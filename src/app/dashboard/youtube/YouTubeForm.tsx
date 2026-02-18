"use client";

import { useState, useRef } from "react";
import { Youtube, Zap, Loader2, AlertCircle, ClipboardPaste, Link2, FileText, Sparkles, Camera, Upload, X, Image as ImageIcon } from "lucide-react";

export default function YouTubeForm() {
    const [url, setUrl] = useState("");
    const [manualTranscript, setManualTranscript] = useState("");
    const [activeTab, setActiveTab] = useState<'link' | 'paste' | 'screenshot'>('link');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    // Screenshot state
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError("Please select an image file (PNG, JPG, etc.)");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setError("Image must be under 50MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setScreenshotPreview(dataUrl);
            setScreenshotBase64(dataUrl);
            setError(null);
        };
        reader.readAsDataURL(file);
    }

    function handlePaste(e: React.ClipboardEvent) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                if (!blob) continue;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    setScreenshotPreview(dataUrl);
                    setScreenshotBase64(dataUrl);
                    setError(null);
                };
                reader.readAsDataURL(blob);
                break;
            }
        }
    }

    function clearScreenshot() {
        setScreenshotPreview(null);
        setScreenshotBase64(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const body: any = {};

            if (activeTab === 'link' && url.trim()) {
                body.videoUrl = url;
            } else if (activeTab === 'paste' && manualTranscript.trim()) {
                body.transcript = manualTranscript;
                if (url.trim()) body.videoUrl = url;
            } else if (activeTab === 'screenshot' && screenshotBase64) {
                body.screenshot = screenshotBase64;
            } else {
                throw new Error(
                    activeTab === 'link' ? "Please enter a YouTube URL." :
                        activeTab === 'paste' ? "Please paste a transcript." :
                            "Please upload or paste a screenshot."
                );
            }

            const res = await fetch("/api/ai/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to process");

            setResult(data);
            setUrl("");
            setManualTranscript("");
            clearScreenshot();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const tabColors = {
        link: { active: 'bg-blue-600 shadow-blue-500/25', btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' },
        paste: { active: 'bg-purple-600 shadow-purple-500/25', btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' },
        screenshot: { active: 'bg-amber-600 shadow-amber-500/25', btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' },
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Main Form Card */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2rem] shadow-2xl">

                {/* Tab Switcher */}
                <div className="flex rounded-xl bg-white/5 p-1 mb-6 sm:mb-8">
                    <button
                        type="button"
                        onClick={() => setActiveTab('link')}
                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-all ${activeTab === 'link' ? `${tabColors.link.active} text-white shadow-lg` : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Link2 className="h-4 w-4" />
                        <span>YT Link</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('paste')}
                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-all ${activeTab === 'paste' ? `${tabColors.paste.active} text-white shadow-lg` : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <ClipboardPaste className="h-4 w-4" />
                        <span>Paste Text</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('screenshot')}
                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-all ${activeTab === 'screenshot' ? `${tabColors.screenshot.active} text-white shadow-lg` : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Camera className="h-4 w-4" />
                        <span>Screenshot</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

                    {/* Tab: YouTube Link */}
                    {activeTab === 'link' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    YouTube Video URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://youtube.com/watch?v=..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Supports youtube.com, youtu.be, and YouTube Shorts links
                            </p>
                        </div>
                    )}

                    {/* Tab: Paste Transcript */}
                    {activeTab === 'paste' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="p-3 sm:p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl sm:rounded-2xl">
                                <p className="text-xs sm:text-sm text-purple-300 leading-relaxed">
                                    <span className="font-bold">📋 How to get the transcript:</span>
                                </p>
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-gray-400">
                                        <span className="font-mono text-purple-400">Desktop:</span> Open video → Click <strong className="text-white">&quot;...&quot;</strong> below video → <strong className="text-white">&quot;Show transcript&quot;</strong>
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        <span className="font-mono text-purple-400">Mobile:</span> Open video → Tap <strong className="text-white">&quot;...more&quot;</strong> in description → Scroll to <strong className="text-white">&quot;Transcript&quot;</strong> section
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    Video URL <span className="text-gray-600 normal-case">(optional — for title)</span>
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://youtube.com/watch?v=... (optional)"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    Paste Transcript
                                </label>
                                <textarea
                                    placeholder="Paste the full YouTube transcript text here..."
                                    value={manualTranscript}
                                    onChange={(e) => setManualTranscript(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none resize-y"
                                    style={{ minHeight: '120px' }}
                                />
                                {manualTranscript.length > 0 && (
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-gray-500">{manualTranscript.length.toLocaleString()} characters</p>
                                        {manualTranscript.length < 50 && (
                                            <p className="text-xs text-amber-400">Need at least 50 characters</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Screenshot */}
                    {activeTab === 'screenshot' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="p-3 sm:p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl sm:rounded-2xl">
                                <p className="text-xs sm:text-sm text-amber-300 leading-relaxed">
                                    <span className="font-bold">📸 Upload a screenshot of the transcript</span>
                                </p>
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-gray-400">
                                        Take a screenshot of the YouTube transcript and upload it here. Our AI will read the text from the image and generate study notes.
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        <span className="font-mono text-amber-400">Tip:</span> You can also <strong className="text-white">Ctrl+V</strong> (or long-press paste on mobile) to paste a screenshot directly!
                                    </p>
                                </div>
                            </div>

                            {/* Upload area */}
                            {!screenshotPreview ? (
                                <div
                                    onPaste={handlePaste}
                                    tabIndex={0}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-full border-2 border-dashed border-white/10 hover:border-amber-500/30 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-white/5 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 outline-none"
                                >
                                    <div className="p-4 rounded-2xl bg-amber-500/10">
                                        <Upload className="h-8 w-8 text-amber-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-300">
                                            Click to upload or paste screenshot
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            PNG, JPG, WEBP up to 50MB
                                        </p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-white/10">
                                    <img
                                        src={screenshotPreview}
                                        alt="Screenshot preview"
                                        className="w-full max-h-[400px] object-contain bg-black/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={clearScreenshot}
                                        className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-red-500/80 rounded-xl transition-all group"
                                    >
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/70 rounded-lg flex items-center gap-2">
                                        <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                                        <span className="text-xs text-gray-300">Screenshot ready</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-sm transition-all transform hover:scale-[1.01] active:scale-95 shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-white ${tabColors[activeTab].btn}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>{activeTab === 'screenshot' ? 'Reading image & summarizing...' : 'AI is analyzing...'}</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5" />
                                Generate Study Notes
                            </>
                        )}
                    </button>

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm font-medium text-red-400">{error}</p>
                            </div>
                            {activeTab === 'link' && (
                                <div className="ml-8 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setActiveTab('paste')} className="text-xs text-purple-400 hover:text-purple-300 underline transition-colors">
                                        → Paste transcript
                                    </button>
                                    <button type="button" onClick={() => setActiveTab('screenshot')} className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors">
                                        → Upload screenshot
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {/* Results Card */}
            {result && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6 sm:mb-8">
                        <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 shrink-0" />
                        <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                            {result.videoTitle || "Analysis Complete"}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-400" />
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Executive Summary</h4>
                            </div>
                            <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5">
                                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {result.summary}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Study Notes</h4>
                            </div>
                            <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5">
                                <div className="text-xs sm:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none">
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

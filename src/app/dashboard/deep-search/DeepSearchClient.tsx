"use client";

import { useState, useRef } from "react";
import { Search, Loader2, Globe, ExternalLink, Sparkles, ArrowRight, AlertCircle, Lightbulb } from "lucide-react";

interface Source {
    index: number;
    title: string;
    url: string;
    snippet: string;
}

interface SearchResult {
    answer: string;
    sources: Source[];
    followUpQuestions: string[];
    query: string;
}

export default function DeepSearchClient() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleSearch(searchQuery?: string) {
        const q = searchQuery || query;
        if (!q.trim() || q.trim().length < 3) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/deep-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: q.trim() }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Search failed");

            setResult(data);
            if (!searchHistory.includes(q.trim())) {
                setSearchHistory(prev => [q.trim(), ...prev.slice(0, 4)]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleFollowUp(question: string) {
        setQuery(question);
        handleSearch(question);
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white px-4 py-6 sm:p-6 md:p-8 animate-in fade-in duration-700">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                            <Globe className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Deep Search</h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-400 ml-[52px] sm:ml-[56px]">
                        Search the web and get AI-powered answers with source citations.
                    </p>
                </header>

                {/* Search Box */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-2xl mb-6 sm:mb-8">
                    <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Ask anything... e.g., 'What is quantum computing?'"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white placeholder-gray-500 focus:bg-white/10 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="w-full py-4 sm:py-5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl sm:rounded-2xl font-bold text-sm transition-all transform hover:scale-[1.01] active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Searching the web & analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5" />
                                    Deep Search
                                </>
                            )}
                        </button>
                    </form>

                    {/* Search History */}
                    {searchHistory.length > 0 && !result && !loading && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-xs text-gray-600 mb-2">Recent searches</p>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setQuery(q); handleSearch(q); }}
                                        className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all truncate max-w-[200px]"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Loading Skeleton */}
                {loading && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem]">
                            <div className="space-y-3">
                                <div className="h-4 bg-white/10 rounded-full w-3/4 animate-pulse" />
                                <div className="h-4 bg-white/10 rounded-full w-full animate-pulse" />
                                <div className="h-4 bg-white/10 rounded-full w-5/6 animate-pulse" />
                                <div className="h-4 bg-white/10 rounded-full w-2/3 animate-pulse" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl animate-pulse">
                                    <div className="h-3 bg-white/10 rounded-full w-2/3 mb-2" />
                                    <div className="h-2 bg-white/10 rounded-full w-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in">
                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Answer Card */}
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-2xl">
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                                <Sparkles className="h-5 w-5 text-emerald-400" />
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Answer</h2>
                            </div>
                            <div className="text-sm sm:text-base text-gray-200 leading-relaxed whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                                {result.answer}
                            </div>
                        </div>

                        {/* Sources */}
                        {result.sources.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Sources ({result.sources.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {result.sources.map((source) => (
                                        <a
                                            key={source.index}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-4 rounded-xl transition-all hover:bg-white/10"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="shrink-0 w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                                                        {source.index}
                                                    </span>
                                                    <p className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
                                                        {source.title}
                                                    </p>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                {source.snippet}
                                            </p>
                                            <p className="text-[10px] text-gray-600 mt-2 truncate">
                                                {source.url}
                                            </p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Follow-up Questions */}
                        {result.followUpQuestions.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    Explore Further
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.followUpQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleFollowUp(q)}
                                            className="group flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-cyan-500/30 rounded-xl text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all text-left"
                                        >
                                            <ArrowRight className="h-3.5 w-3.5 text-cyan-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

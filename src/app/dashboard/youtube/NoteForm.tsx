'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NoteForm() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: url }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process video');

            setUrl('');
            router.refresh(); // Refresh to see new note in the list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-[2rem] border border-[#eee] p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.02)] mb-10">
            <h2 className="text-xl font-black text-[#111] mb-6">Analyze New Video</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                    <input
                        type="url"
                        placeholder="Paste YouTube Video Link here..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        className="w-full px-6 py-5 bg-[#f9f9f9] border border-[#eee] rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-[#111] text-white rounded-2xl font-bold text-sm hover:bg-[#333] transition-all transform hover:scale-[1.01] active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>AI is processing video...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Study Notes
                        </>
                    )}
                </button>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-tighter">{error}</p>
                    </div>
                )}
            </form>
        </div>
    );
}

import { db } from '@/lib/db';
import { youtubeNotes } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import NoteForm from './NoteForm';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function YouTubeToolPage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect('/login');
    }

    const userId = Number(session.user.id);

    if (isNaN(userId)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <div className="text-center p-10 bg-white rounded-3xl border border-[#eee] shadow-xl">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Account Configuration Error</h2>
                    <p className="text-sm text-gray-500">Could not retrieve a valid user ID. Please try signing out and back in.</p>
                </div>
            </div>
        );
    }

    const notes = await db.select()
        .from(youtubeNotes)
        .where(eq(youtubeNotes.userId, userId))
        .orderBy(desc(youtubeNotes.createdAt));

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 md:p-10 font-[Inter,sans-serif]">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-[#111] tracking-tight">AI Study Companion</h1>
                    <p className="text-[#666] mt-2">Transcribe, summarize, and learn from any YouTube video instantly.</p>
                </header>

                <NoteForm />

                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-[#eee] pb-4">
                        <h2 className="text-sm font-black text-[#111] uppercase tracking-widest">Library ({notes.length})</h2>
                    </div>

                    {notes.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#ddd]">
                            <p className="text-sm font-bold text-[#aaa] uppercase tracking-widest">Your study notes will appear here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {notes.map((note) => (
                                <div key={note.id} className="bg-white rounded-3xl border border-[#eee] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-[#111] mb-1">{note.videoTitle}</h3>
                                            <a href={note.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-bold hover:underline truncate block max-w-md">
                                                {note.videoUrl}
                                            </a>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#bbb] uppercase bg-[#fafafa] px-3 py-1 rounded-full border border-[#eee]">
                                            {note.createdAt?.toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <h4 className="text-[11px] font-black text-[#999] uppercase tracking-widest">Executive Summary</h4>
                                            <p className="text-sm text-[#444] leading-relaxed">{note.summary}</p>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-[11px] font-black text-[#999] uppercase tracking-widest">Structured Study Notes</h4>
                                            <div className="prose prose-sm prose-slate max-w-none">
                                                <div className="text-sm text-[#444] whitespace-pre-wrap leading-relaxed">
                                                    {note.studyNotes}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

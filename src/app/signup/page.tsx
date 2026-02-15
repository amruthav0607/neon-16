'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to sign up');
            }

            router.push('/login?message=Account created. Please sign in (Admin approval may be required).');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-[Inter,sans-serif]">
            <div className="w-full max-w-lg">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-[#eee] overflow-hidden">
                    <div className="p-10 md:p-14">
                        <header className="mb-10 text-center">
                            <h1 className="text-4xl font-black text-[#111] tracking-tight mb-3">Create Account</h1>
                            <p className="text-[#888] text-sm font-medium">Join our exclusive business network</p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label
                                    htmlFor="name"
                                    className="text-[11px] font-black text-[#bbb] uppercase tracking-widest pl-1"
                                >
                                    Full Identity
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    className="w-full px-6 py-4 bg-[#f9f9f9] border border-[#eee] rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-[11px] font-black text-[#bbb] uppercase tracking-widest pl-1"
                                >
                                    Work Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full px-6 py-4 bg-[#f9f9f9] border border-[#eee] rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-[11px] font-black text-[#bbb] uppercase tracking-widest pl-1"
                                >
                                    Access Key
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="Minimum 6 characters"
                                    className="w-full px-6 py-4 bg-[#f9f9f9] border border-[#eee] rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-[#111] text-white rounded-2xl font-bold text-sm hover:bg-[#333] transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Proccessing...</span>
                                    </>
                                ) : 'Register Account'}
                            </button>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <p className="text-xs font-bold text-red-600 uppercase tracking-tighter">{error}</p>
                                </div>
                            )}
                        </form>

                        <div className="mt-12 pt-8 border-t border-[#f5f5f5] text-center">
                            <p className="text-sm text-[#888]">
                                Already a member?{' '}
                                <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-400 transition-colors">
                                    Sign in instead
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
                <p className="mt-10 text-center text-[10px] font-bold text-[#ddd] uppercase tracking-[0.3em]">
                    Data Encrypted & Securely Managed
                </p>
            </div>
        </div>
    );
}

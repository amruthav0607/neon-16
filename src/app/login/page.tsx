'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import Link from 'next/link';

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    );

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-[Inter,sans-serif]">
            <div className="w-full max-w-lg">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-[#eee] overflow-hidden">
                    <div className="p-10 md:p-14">
                        <header className="mb-12 text-center">
                            <h1 className="text-4xl font-black text-[#111] tracking-tight mb-3">Sign In</h1>
                            <p className="text-[#888] text-sm font-medium">Access your enterprise dashboard</p>
                        </header>

                        <form action={formAction} className="space-y-6">
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-[11px] font-black text-[#bbb] uppercase tracking-widest pl-1"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@example.com"
                                    className="w-full px-6 py-4 bg-[#f9f9f9] border border-[#eee] rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-[11px] font-black text-[#bbb] uppercase tracking-widest pl-1"
                                >
                                    Security Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-6 py-4 bg-[#f9f9f9] border border-[#eee] rounded-2xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                aria-disabled={isPending}
                                className="w-full py-5 bg-[#111] text-white rounded-2xl font-bold text-sm hover:bg-[#333] transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                {isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Authenticating...</span>
                                    </>
                                ) : 'Sign In Now'}
                            </button>

                            {errorMessage && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <p className="text-xs font-bold text-red-600 uppercase tracking-tighter">{errorMessage}</p>
                                </div>
                            )}
                        </form>

                        <div className="mt-12 pt-8 border-t border-[#f5f5f5] text-center">
                            <p className="text-sm text-[#888]">
                                New to the platform?{' '}
                                <Link href="/signup" className="text-indigo-600 font-bold hover:text-indigo-400 transition-colors">
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
                <p className="mt-10 text-center text-[10px] font-bold text-[#ddd] uppercase tracking-[0.3em]">
                    Enterprise Security Standards Applied
                </p>
            </div>
        </div>
    );
}

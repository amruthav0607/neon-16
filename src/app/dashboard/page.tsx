import { auth, signOut } from '@/auth';
import Link from 'next/link';

export default async function DashboardPage() {
    const session = await auth();
    const user = session?.user;
    const isApproved = user?.isApproved;

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-[Inter,sans-serif]">
            <div className="w-full max-w-xl">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-[#eee] overflow-hidden">
                    <div className="p-10 md:p-14">
                        <header className="mb-10 text-center">
                            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                                <span className="text-3xl font-black">{user?.name?.charAt(0) || 'U'}</span>
                            </div>
                            <h1 className="text-3xl font-black text-[#111] tracking-tight mb-2">Welcome back, {user?.name}</h1>
                            <p className="text-[#888] text-sm">You are currently logged in as {user?.email}</p>
                        </header>

                        {!isApproved ? (
                            <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-8 text-center mb-10">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
                                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-bold text-amber-900 mb-2">Approval Pending</h2>
                                <p className="text-amber-700/80 text-sm leading-relaxed">
                                    Your account is currently under review by our administrators. You'll gain full access once your profile is approved.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-indigo-50/30 border border-indigo-100 rounded-3xl p-8 mb-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Account Overview</h2>
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg uppercase border border-indigo-200">
                                        Active Profile
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-indigo-50">
                                        <span className="text-sm text-indigo-700/60 font-medium">Account Role</span>
                                        <span className="text-sm font-bold text-indigo-900 uppercase tracking-tighter">{user?.role}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-indigo-50">
                                        <span className="text-sm text-indigo-700/60 font-medium">Security Status</span>
                                        <span className="text-sm font-bold text-indigo-900">Verified</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {isApproved && (
                                <Link
                                    href="/dashboard/youtube"
                                    className="block w-full text-center py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-200"
                                >
                                    Try AI YouTube Tool
                                </Link>
                            )}

                            {user?.role === 'admin' && (
                                <Link
                                    href="/admin"
                                    className="block w-full text-center py-4 bg-[#111] text-white rounded-2xl font-bold text-sm hover:bg-[#333] transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/10"
                                >
                                    Access Admin Console
                                </Link>
                            )}

                            <form
                                action={async () => {
                                    'use server';
                                    await signOut();
                                }}
                            >
                                <button className="w-full text-center py-4 bg-white border border-[#eee] text-[#f43f5e] rounded-2xl font-bold text-sm hover:bg-red-50 hover:border-red-100 transition-all transform hover:scale-[1.02] active:scale-95">
                                    Sign Out Securely
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                <p className="mt-8 text-center text-[11px] font-bold text-[#bbb] uppercase tracking-[0.2em] animate-pulse">
                    Secure Dashboard Interface v2.0
                </p>
            </div>
        </div>
    );
}

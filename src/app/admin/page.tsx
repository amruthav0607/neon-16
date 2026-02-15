import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function toggleApproval(userId: number, currentStatus: boolean) {
    'use server';
    await db.update(users)
        .set({ isApproved: !currentStatus })
        .where(eq(users.id, userId));
    revalidatePath('/admin');
}

export default async function AdminDashboard() {
    const session = await auth();

    if (!session || session.user?.role !== 'admin') {
        redirect('/dashboard');
    }

    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 md:p-10 font-[Inter,sans-serif]">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#111] tracking-tight">System Administration</h1>
                        <p className="text-[#666] mt-1 text-sm">Review, approve and manage user access across the platform.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-white rounded-xl border border-[#eee] flex items-center gap-2 shadow-sm">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-semibold text-[#444] uppercase tracking-wider">System Live</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-2xl border border-[#eee] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <p className="text-xs font-bold text-[#888] uppercase tracking-widest mb-1">Total Users</p>
                        <h2 className="text-3xl font-black text-[#111]">{allUsers.length}</h2>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#eee] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <p className="text-xs font-bold text-[#888] uppercase tracking-widest mb-1">Pending</p>
                        <h2 className="text-3xl font-black text-[#111]">{allUsers.filter(u => !u.isApproved).length}</h2>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#eee] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <p className="text-xs font-bold text-[#888] uppercase tracking-widest mb-1">Active Admins</p>
                        <h2 className="text-3xl font-black text-[#111]">{allUsers.filter(u => u.role === 'admin').length}</h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#eee] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#fcfcfc] border-b border-[#eee]">
                                    <th className="px-8 py-5 text-[11px] font-bold text-[#999] uppercase tracking-[0.1em]">User Profile</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-[#999] uppercase tracking-[0.1em]">Authorization</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-[#999] uppercase tracking-[0.1em]">Access Status</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-[#999] uppercase tracking-[0.1em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f5f5f5]">
                                {allUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-[#fafafa] transition-all duration-200">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f0f0f0] to-[#e0e0e0] flex items-center justify-center text-[#555] font-bold text-sm shadow-inner uppercase">
                                                    {user.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#111] leading-tight">{user.name}</p>
                                                    <p className="text-[12px] text-[#888] mt-0.5">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${user.role === 'admin'
                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm">
                                            {user.isApproved ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-xs font-bold text-[#111]">Authorized</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-amber-600">
                                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></div>
                                                    <span className="text-xs font-bold text-amber-700">Restricted</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <form action={toggleApproval.bind(null, user.id, user.isApproved)}>
                                                <button
                                                    type="submit"
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 transform hover:scale-[1.03] active:scale-95 ${user.isApproved
                                                            ? 'bg-white border border-[#eee] text-[#f43f5e] hover:bg-red-50 hover:border-red-100'
                                                            : 'bg-[#111] text-white shadow-lg shadow-black/10 hover:bg-[#333]'
                                                        }`}
                                                >
                                                    {user.isApproved ? 'Revoke Access' : 'Authorize User'}
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                                {allUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <p className="text-sm font-bold text-[#888] uppercase tracking-widest">No matching records found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

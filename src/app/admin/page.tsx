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

async function changeRole(userId: number, newRole: 'admin' | 'user') {
    'use server';
    await db.update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId));
    revalidatePath('/admin');
}

async function deleteUser(userId: number) {
    'use server';
    await db.delete(users).where(eq(users.id, userId));
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
                                            <div className="flex items-center justify-end gap-3">
                                                <form action={changeRole.bind(null, user.id, user.role === 'admin' ? 'user' : 'admin')}>
                                                    <button
                                                        type="submit"
                                                        className="p-2 text-[#888] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                        </svg>
                                                    </button>
                                                </form>

                                                <form action={toggleApproval.bind(null, user.id, user.isApproved)}>
                                                    <button
                                                        type="submit"
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 transform hover:scale-[1.03] active:scale-95 ${user.isApproved
                                                            ? 'bg-white border border-[#eee] text-[#f43f5e] hover:bg-red-50 hover:border-red-100'
                                                            : 'bg-[#111] text-white shadow-lg shadow-black/10 hover:bg-[#333]'
                                                            }`}
                                                    >
                                                        {user.isApproved ? 'Revoke' : 'Approve'}
                                                    </button>
                                                </form>

                                                <form action={deleteUser.bind(null, user.id)}>
                                                    <button
                                                        type="submit"
                                                        className="p-2 text-[#888] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </form>
                                            </div>
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

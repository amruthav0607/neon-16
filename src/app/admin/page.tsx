import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function approveUser(formData: FormData) {
    'use server';
    const userId = formData.get('userId');
    if (!userId) return;

    await db.update(users)
        .set({ isApproved: true })
        .where(eq(users.id, Number(userId)));

    revalidatePath('/admin');
}

export default async function AdminPage() {
    const session = await auth();

    if (session?.user?.role !== 'admin') {
        redirect('/dashboard');
    }

    const pendingUsers = await db.select().from(users).where(eq(users.isApproved, false));

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="mx-auto max-w-4xl bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

                <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>

                {pendingUsers.length === 0 ? (
                    <p className="text-gray-500">No pending users.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pendingUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <form action={approveUser}>
                                                <input type="hidden" name="userId" value={user.id} />
                                                <button type="submit" className="text-green-600 hover:text-green-900 font-medium">
                                                    Approve
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

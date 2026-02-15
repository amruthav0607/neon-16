import { auth, signOut } from '@/auth';
import Link from 'next/link';

export default async function DashboardPage() {
    const session = await auth();

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="mx-auto max-w-4xl bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                <p className="mb-4">
                    Welcome, <span className="font-semibold">{session?.user?.name}</span>!
                </p>
                <p className="mb-6 text-gray-600">
                    Role: <span className="uppercase font-bold">{session?.user?.role}</span>
                </p>

                {session?.user?.role === 'admin' && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                        <h2 className="font-bold text-blue-800 mb-2">Admin Actions</h2>
                        <Link href="/admin" className="text-blue-600 hover:underline">
                            Go to Admin Panel (Approve Users)
                        </Link>
                    </div>
                )}

                <form
                    action={async () => {
                        'use server';
                        await signOut();
                    }}
                >
                    <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Sign Out
                    </button>
                </form>
            </div>
        </div>
    );
}

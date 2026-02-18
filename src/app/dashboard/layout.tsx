import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Settings, LogOut, FileText, Youtube, Layers } from "lucide-react";
import { signOut } from "@/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white/5 border-r border-white/10 flex flex-col backdrop-blur-3xl">
                <div className="p-6">
                    <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Premium Auth
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Overview
                    </Link>

                    {session.user.role === "ADMIN" && (
                        <Link
                            href="/dashboard/admin"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                        >
                            <Users className="h-5 w-5" />
                            Manage Users
                        </Link>
                    )}

                    <Link
                        href="/dashboard/workspaces"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                    >
                        <Layers className="h-5 w-5" />
                        Workspaces
                    </Link>

                    <Link
                        href="/dashboard/documents"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                    >
                        <FileText className="h-5 w-5" />
                        My Documents
                    </Link>

                    <Link
                        href="/dashboard/youtube"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                    >
                        <Youtube className="h-5 w-5" />
                        YouTube Summarizer
                    </Link>

                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                    >
                        <Settings className="h-5 w-5" />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <form action={async () => {
                        "use server";
                        await signOut();
                    }}>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 transition-all text-gray-400 hover:text-red-400">
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 backdrop-blur-3xl bg-black/20">
                    <div className="text-sm text-gray-400">
                        Welcome back, <span className="text-white font-medium">{session.user.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                            {session.user.name?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

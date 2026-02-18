import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UserTable from "./UserTable";

export default async function AdminDashboard() {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const rawUsers = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isApproved: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    // Serialize dates to plain objects for client component
    const users = rawUsers.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
    }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                <p className="text-gray-400">Approve or revoke access for dashboard users.</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <UserTable initialUsers={users} />
            </div>
        </div>
    );
}


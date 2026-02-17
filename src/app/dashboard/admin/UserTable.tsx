"use client";

import { useState } from "react";
import { approveUser, revokeUser } from "@/lib/actions";
import { CheckCircle2, XCircle, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isApproved: boolean;
    createdAt: Date;
}

export default function UserTable({ initialUsers }: { initialUsers: User[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        const action = currentStatus ? revokeUser : approveUser;
        const result = await action(userId);

        if (result.success) {
            setUsers(users.map(u =>
                u.id === userId ? { ...u, isApproved: !currentStatus } : u
            ));
        }
        setLoadingId(null);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-6 py-4 text-sm font-semibold text-gray-300">User</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-300">Role</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-300">Status</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                        <UserIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{user.name || "Anonymous"}</div>
                                        <div className="text-xs text-gray-400">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <Shield className={cn(
                                        "h-4 w-4",
                                        user.role === "ADMIN" ? "text-purple-400" : "text-blue-400"
                                    )} />
                                    <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        {user.role}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                    user.isApproved
                                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                )}>
                                    {user.isApproved ? "Approved" : "Pending"}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                {user.role !== "ADMIN" && (
                                    <button
                                        onClick={() => handleToggleApproval(user.id, user.isApproved)}
                                        disabled={loadingId === user.id}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50",
                                            user.isApproved
                                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                                        )}
                                    >
                                        {loadingId === user.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            user.isApproved ? (
                                                <>
                                                    <XCircle className="h-3 w-3" />
                                                    Revoke
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Approve
                                                </>
                                            )
                                        )}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

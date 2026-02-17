import { auth } from "@/auth";
import { LayoutDashboard, Users, Activity, Zap } from "lucide-react";

export default async function DashboardPage() {
    const session = await auth();

    const stats = [
        { name: "Total Engagement", value: "84.2%", icon: Activity, color: "text-blue-400" },
        { name: "Active Sessions", value: "1,284", icon: Users, color: "text-purple-400" },
        { name: "System Status", value: "Optimal", icon: Zap, color: "text-green-400" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Overview</h1>
                    <p className="text-gray-400">Welcome back to your premium command center.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/[0.08] transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={stat.color}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-1 rounded-md">Last 24h</span>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">{stat.value}</div>
                        <div className="text-sm text-gray-400">{stat.name}</div>
                    </div>
                ))}
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 h-64 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <LayoutDashboard className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to expand?</h3>
                <p className="text-gray-400 max-w-sm">This is your dashboard. You can now start building your custom modules and integrating with Neon DB.</p>
            </div>
        </div>
    );
}

import Link from "next/link";
import { auth } from "@/auth";
import { ArrowRight, Shield, Zap, Layout, CheckCircle } from "lucide-react";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-blue-500/30">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          AURA
        </div>
        <div className="flex items-center gap-8">
          {session ? (
            <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 group">
              Dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-400 hover:text-white transition-colors">Log In</Link>
              <Link href="/auth/signup" className="px-5 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <Zap className="h-3.5 w-3.5" />
            Next-Gen Authentication System
          </div>
          <h1 className="text-7xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Secure Access, <br />
            <span className="text-gray-500">Unmatched Design.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Experience a premium authentication dashboard built with Next.js, Prisma, and Neon DB. Featuring admin-controlled access for maximum security.
          </p>
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <Link href="/auth/signup" className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
              Get Started
            </Link>
            <Link href="#features" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
              View Features
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40">
          {[
            { title: "Admin Approval", desc: "Granular control over who accesses your system.", color: "text-blue-400", icon: Shield },
            { title: "Role Management", desc: "Easily switch between Admin and User roles.", color: "text-purple-400", icon: Layout },
            { title: "Real-time Access", desc: "Instant approval updates and dashboard access.", color: "text-green-400", icon: CheckCircle }
          ].map((feature, i) => (
            <div key={i} className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.07]">
              <div className={`mb-6 p-3 rounded-2xl bg-white/5 w-fit group-hover:scale-110 transition-transform ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-gray-500 text-sm">
            © 2026 AURA Dashboard. Built for premium experiences.
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

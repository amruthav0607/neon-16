"use client";

import { useState } from "react";
import { Settings, User, Shield, Bell, Palette, Save, Check, Loader2 } from "lucide-react";

interface SettingsClientProps {
    user: {
        name?: string | null;
        email?: string | null;
        role?: string;
        id?: string;
    };
}

export default function SettingsClient({ user }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Profile form state
    const [name, setName] = useState(user.name || "");
    const [email] = useState(user.email || "");

    // Preferences state
    const [theme, setTheme] = useState("dark");
    const [language, setLanguage] = useState("english");
    const [notifications, setNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);

    async function handleSave() {
        setSaving(true);
        // Simulate save (can be connected to a real API later)
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'preferences', label: 'Preferences', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-[#030303] text-white px-4 py-6 sm:p-6 md:p-8 animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 shrink-0" />
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-400 ml-10 sm:ml-11">
                        Manage your account preferences and security.
                    </p>
                </header>

                {/* Tab Navigation */}
                <div className="flex overflow-x-auto gap-1 sm:gap-2 rounded-xl bg-white/5 p-1 mb-6 sm:mb-8 scrollbar-none">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-2xl">

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-400" />
                                Profile Information
                            </h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0">
                                    {name.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm sm:text-base">{name || "Unknown"}</p>
                                    <p className="text-xs sm:text-sm text-gray-400">{email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 uppercase tracking-wider">
                                        {user.role || "USER"}
                                    </span>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">Email cannot be changed.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Palette className="h-5 w-5 text-purple-400" />
                                Preferences
                            </h2>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Theme
                                    </label>
                                    <div className="flex gap-3">
                                        {['dark', 'light', 'system'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all capitalize ${theme === t
                                                        ? 'bg-purple-600 text-white shadow-lg'
                                                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Summary Language
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full sm:w-auto px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="english" className="bg-[#1a1a1a]">English</option>
                                        <option value="hindi" className="bg-[#1a1a1a]">Hindi</option>
                                        <option value="arabic" className="bg-[#1a1a1a]">Arabic</option>
                                        <option value="spanish" className="bg-[#1a1a1a]">Spanish</option>
                                        <option value="french" className="bg-[#1a1a1a]">French</option>
                                        <option value="german" className="bg-[#1a1a1a]">German</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Bell className="h-5 w-5 text-amber-400" />
                                Notification Settings
                            </h2>

                            <div className="space-y-4">
                                <ToggleRow
                                    label="Push Notifications"
                                    description="Get notified when your summaries are ready"
                                    checked={notifications}
                                    onChange={setNotifications}
                                />
                                <ToggleRow
                                    label="Email Notifications"
                                    description="Receive summaries and updates via email"
                                    checked={emailNotifications}
                                    onChange={setEmailNotifications}
                                />
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-400" />
                                Security
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-3 sm:p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <p className="text-xs text-amber-300">
                                    ⚠️ Password changes will require you to log in again.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full sm:w-auto px-8 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all transform hover:scale-[1.01] active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : saved ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Toggle switch component
function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="mr-4">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-white/10'
                    }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-md ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
}


"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, FileText, MessageSquare, Trash2, Loader2, Search, Check, ChevronsUpDown } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

// Custom Modal Implementation below used instead of ui/dialog


interface Workspace {
    id: string;
    name: string;
    createdAt: Date;
    _count?: { documents: number };
}

interface Document {
    id: string;
    name: string;
    createdAt: Date;
}

interface WorkspaceClientProps {
    workspaces: Workspace[];
    documents: Document[];
    selectedWorkspaceId?: string;
}

export default function WorkspaceClient({ workspaces: initialWorkspaces, documents: initialDocuments, selectedWorkspaceId }: WorkspaceClientProps) {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
    const [documents, setDocuments] = useState<Document[]>(initialDocuments);

    // Create Workspace State
    const [isCreating, setIsCreating] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);

    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

    // Sync state
    useEffect(() => {
        setWorkspaces(initialWorkspaces);
        setDocuments(initialDocuments);
    }, [initialWorkspaces, initialDocuments]);

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/workspaces", {
                method: "POST",
                body: JSON.stringify({ name: newWorkspaceName })
            });
            if (res.ok) {
                const newWs = await res.json();
                setWorkspaces([newWs, ...workspaces]);
                router.push(`/dashboard/workspaces?workspaceId=${newWs.id}`);
                setIsCreateModalOpen(false);
                setNewWorkspaceName("");
            }
        } catch (e) {
            alert("Failed to create workspace");
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedWorkspaceId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", selectedWorkspaceId);

        try {
            const res = await fetch("/api/document-upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                setDocuments([
                    { id: data.id, name: data.name, createdAt: new Date() },
                    ...documents
                ]);
            } else {
                alert(data.error || "Upload failed");
            }
        } catch (e) {
            alert("Upload failed");
        } finally {
            setIsUploading(false);
            e.target.value = ""; // Reset
        }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm("Delete this document?")) return;
        try {
            const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDocuments(documents.filter(d => d.id !== id));
            } else {
                alert("Failed to delete");
            }
        } catch (e) {
            alert("Error deleting document");
        }
    };

    const [chatHistory, setChatHistory] = useState<Record<string, any[]>>({});

    const handleChatUpdate = (workspaceId: string, messages: any[]) => {
        setChatHistory(prev => ({
            ...prev,
            [workspaceId]: messages
        }));
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Sidebar */}
            <div className="w-80 flex flex-col gap-6">

                {/* Workspace Selector */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <label className="text-sm text-gray-400 font-medium">Workspace</label>
                    <select
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                        value={selectedWorkspaceId || ""}
                        onChange={(e) => router.push(`/dashboard/workspaces?workspaceId=${e.target.value}`)}
                    >
                        <option value="" disabled>Select a workspace...</option>
                        {workspaces.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/20 hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all"
                    >
                        <Plus className="h-4 w-4" /> New Workspace
                    </button>
                </div>

                {/* Document List */}
                {selectedWorkspaceId ? (
                    <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h3 className="font-semibold text-white">Documents</h3>
                            <label className="cursor-pointer p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors">
                                <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} accept=".pdf,.txt,.md,.json" />
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </label>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {documents.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No documents yet.
                                </div>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-300 truncate">{doc.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-all"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4 text-center border border-dashed border-white/10 rounded-xl">
                        Select a workspace to view documents
                    </div>
                )}
            </div>

            {/* Main Content - Chat */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col relative">
                {selectedWorkspaceId ? (
                    <ChatInterface
                        workspaceId={selectedWorkspaceId}
                        workspaceName={selectedWorkspace?.name || "Workspace"}
                        onClose={() => { }} // No close needed for main view
                        initialMessages={chatHistory[selectedWorkspaceId] || []}
                        onMessagesChange={(msgs) => handleChatUpdate(selectedWorkspaceId, msgs)}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="p-4 rounded-full bg-white/5 mb-4">
                            <MessageSquare className="h-8 w-8 opacity-50" />
                        </div>
                        <p>Select a workspace to start chatting</p>
                    </div>
                )}
            </div>

            {/* Create Workspace Modal (Simple Overlay) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Create Workspace</h2>
                        <input
                            placeholder="Workspace Name (e.g. 'Project Alpha')"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 rounded-xl hover:bg-white/10 text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateWorkspace}
                                disabled={isCreating || !newWorkspaceName.trim()}
                                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                            >
                                {isCreating ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

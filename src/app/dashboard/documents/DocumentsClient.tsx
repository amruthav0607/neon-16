"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Trash2, Loader2, FolderOpen, Clock, Search } from "lucide-react";

interface Workspace {
    id: string;
    name: string;
    createdAt: Date;
}

interface Document {
    id: string;
    name: string;
    createdAt: Date;
}

interface DocumentsClientProps {
    workspaces: Workspace[];
    documents: Document[];
    selectedWorkspaceId?: string;
}

export default function DocumentsClient({ workspaces, documents: initialDocuments, selectedWorkspaceId }: DocumentsClientProps) {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>(initialDocuments);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        setDocuments(initialDocuments);
    }, [initialDocuments]);

    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

    const handleUpload = async (file: File) => {
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
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
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

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Workspace Selector Bar */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <FolderOpen className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Workspace</label>
                    <select
                        className="w-full bg-transparent text-white outline-none text-sm mt-0.5 cursor-pointer"
                        value={selectedWorkspaceId || ""}
                        onChange={(e) => router.push(`/dashboard/documents?workspaceId=${e.target.value}`)}
                    >
                        <option value="" disabled>Select a workspace...</option>
                        {workspaces.map(w => (
                            <option key={w.id} value={w.id} className="bg-[#1a1a1a]">{w.name}</option>
                        ))}
                    </select>
                </div>
                {selectedWorkspaceId && (
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                        <input type="file" className="hidden" onChange={handleFileInput} disabled={isUploading} accept=".pdf,.txt,.md,.json" />
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isUploading ? "Uploading..." : "Upload"}
                    </label>
                )}
            </div>

            {/* Content */}
            {!selectedWorkspaceId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-5 rounded-2xl bg-white/5 mb-5">
                        <FolderOpen className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Select a workspace</h3>
                    <p className="text-gray-500 text-sm max-w-sm">Choose a workspace from the dropdown above to view and manage its documents.</p>
                </div>
            ) : (
                <>
                    {/* Search Bar */}
                    {documents.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Drop Zone + Document Grid */}
                    {documents.length === 0 ? (
                        <div
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <div className="p-4 rounded-2xl bg-white/5 inline-block mb-4">
                                <Upload className="h-8 w-8 text-gray-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">No documents yet</h3>
                            <p className="text-gray-500 text-sm mb-4">Drag and drop a file here, or click the Upload button above.</p>
                            <p className="text-gray-600 text-xs">Supported: PDF, TXT, MD, JSON</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDocuments.map(doc => (
                                <div key={doc.id} className="group relative p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                                            <FileText className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-white truncate">{doc.name}</h4>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <Clock className="h-3 w-3 text-gray-600" />
                                                <span className="text-xs text-gray-500">{formatDate(doc.createdAt)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                            title="Delete document"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats Footer */}
                    {documents.length > 0 && (
                        <div className="text-sm text-gray-500 pt-2">
                            {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? 's' : ''} in <span className="text-gray-300">{selectedWorkspace?.name}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

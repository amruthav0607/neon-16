"use client";

import { useState, useEffect } from "react";
import { FileText, Upload, Plus, MessageSquare, Trash2, Loader2, X } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

interface Document {
    id: string;
    name: string;
    createdAt: Date;
}

export default function DocumentsClient({ initialDocuments }: { initialDocuments: any[] }) {
    const [documents, setDocuments] = useState<Document[]>(initialDocuments);
    const [isUploading, setIsUploading] = useState(false);
    const [activeChatDoc, setActiveChatDoc] = useState<Document | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Sync state if initialDocuments changes (e.g. on navigation)
    useEffect(() => {
        setDocuments(initialDocuments);
    }, [initialDocuments]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/document-upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.error) {
                setUploadError(data.details ? `${data.error}: ${data.details}` : data.error);
            } else {
                setDocuments((prev) => [
                    {
                        id: data.id,
                        name: data.name,
                        createdAt: new Date()
                    },
                    ...prev
                ]);
            }
        } catch (err) {
            setUploadError("Failed to upload document. Please check your connection.");
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setDocuments((prev) => prev.filter((doc) => doc.id !== id));
                if (activeChatDoc?.id === id) {
                    setActiveChatDoc(null);
                }
            } else {
                const data = await response.json();
                alert(data.error || "Failed to delete document");
            }
        } catch (err) {
            alert("Failed to delete document. Please try again.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Document List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload Card */}
                    <label className="group relative flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-white/[0.07] transition-all cursor-pointer overflow-hidden">
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.txt,.md,.js,.py,.json,.csv"
                            disabled={isUploading}
                        />
                        <div className="mb-4 p-4 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                            {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                        </div>
                        <h3 className="text-xl font-bold mb-1">Upload Document</h3>
                        <p className="text-gray-400 text-sm text-center">PDF or Text files (Max 50MB)</p>
                        {uploadError && (
                            <div className="mt-4 text-center">
                                <p className="text-red-400 text-sm font-medium">{uploadError}</p>
                            </div>
                        )}
                    </label>

                    {/* Existing Documents */}
                    {documents.map((doc) => (
                        <div key={doc.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl transition-all"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-1 truncate pr-4">{doc.name}</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                            <button
                                onClick={() => setActiveChatDoc(doc)}
                                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Chat with AI
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Interface Side */}
            <div className="lg:col-span-1">
                {activeChatDoc ? (
                    <div className="sticky top-8">
                        <ChatInterface
                            documentId={activeChatDoc.id}
                            documentName={activeChatDoc.name}
                            onClose={() => setActiveChatDoc(null)}
                        />
                    </div>
                ) : (
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 border-dashed flex flex-col items-center justify-center text-center h-[600px] sticky top-8">
                        <div className="p-4 rounded-3xl bg-white/5 text-gray-600 mb-6">
                            <MessageSquare className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-400">No Active Chat</h3>
                        <p className="text-gray-500 max-w-[200px] mt-2">Select a document to start a conversation with the AI.</p>

                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Send, Bot, User, Loader2, Sparkles, Files } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: any[];
}

interface ChatInterfaceProps {
    documentId?: string;
    documentName?: string;
    workspaceId?: string;
    workspaceName?: string;
    onClose: () => void;
}

export default function ChatInterface({ documentId, documentName, workspaceId, workspaceName, onClose }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const body = workspaceId
                ? { workspaceId, question: userMessage }
                : { documentId, question: userMessage };

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.error) {
                setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
            } else {
                setMessages((prev) => [...prev, { role: "assistant", content: data.answer, sources: data.sources }]);
            }
        } catch (error) {
            setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect to the server." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const targetName = workspaceId ? workspaceName : documentName;
    const isWorkspace = !!workspaceId;

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isWorkspace ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {isWorkspace ? <Files className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            {isWorkspace ? "Workspace Chat" : "Document Chat"}
                            {isWorkspace && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">RAG Active</span>}
                        </h3>
                        <p className="text-sm text-gray-400 truncate max-w-[300px]">{targetName}</p>
                    </div>
                </div>
                {/* Only show Close button if it's a modal/overlay (document interactions usually) */}
                {documentId && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                    >
                        Close
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <div className={`p-4 rounded-full ${isWorkspace ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <p className="text-gray-300 max-w-xs">
                            {isWorkspace
                                ? "Ask questions across all documents in this workspace. Try asking specific details or summaries."
                                : "Ask anything about this document."}
                        </p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${m.role === "user" ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400"}`}>
                            {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`max-w-[85%] space-y-2`}>
                            <div className={`p-4 rounded-2xl ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"}`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            </div>
                            {/* Sources */}
                            {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                                <div className="text-xs text-gray-500 pl-2 space-y-1">
                                    <p className="font-semibold uppercase tracking-wider opacity-70 mb-1">Sources:</p>
                                    {m.sources.map((s: any, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">{idx + 1}</span>
                                            {s.type === 'web' ? (
                                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 underline decoration-white/20 hover:decoration-blue-400/50 truncate max-w-[300px]">
                                                    {s.title}
                                                </a>
                                            ) : (
                                                <span className="truncate max-w-[300px]">{s.name}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 text-gray-400 flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 rounded-tl-none flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isWorkspace ? "Ask about your workspace documents..." : "Ask a question..."}
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                    <Send className="h-5 w-5" />
                </button>
            </form>
        </div>
    );
}

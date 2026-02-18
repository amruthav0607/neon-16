"use client";

import { useState, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Files, ArrowUpRight } from "lucide-react";

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
    initialMessages?: Message[];
    onMessagesChange?: (messages: Message[]) => void;
}

export default function ChatInterface({
    documentId,
    documentName,
    workspaceId,
    workspaceName,
    onClose,
    initialMessages = [],
    onMessagesChange
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Update local state when initialMessages changes (e.g. switching workspaces)
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    const updateMessages = (newMessages: Message[]) => {
        setMessages(newMessages);
        onMessagesChange?.(newMessages);
    };

    const [selectedCitation, setSelectedCitation] = useState<any | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput("");

        const newMessagesWithOptions = [...messages, { role: "user", content: userMessage } as Message];
        updateMessages(newMessagesWithOptions);
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
                updateMessages([...newMessagesWithOptions, { role: "assistant", content: `Error: ${data.error}` }]);
            } else {
                updateMessages([...newMessagesWithOptions, { role: "assistant", content: data.answer, sources: data.sources }]);
            }
        } catch (error) {
            updateMessages([...newMessagesWithOptions, { role: "assistant", content: "Failed to connect to the server." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const targetName = workspaceId ? workspaceName : documentName;
    const isWorkspace = !!workspaceId;

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden relative">
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
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedCitation(s)}
                                            className="flex items-center gap-2 hover:bg-white/5 p-1 rounded transition-colors text-left w-full group"
                                        >
                                            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] group-hover:bg-blue-500 group-hover:text-white transition-colors">{idx + 1}</span>
                                            {s.type === 'web' ? (
                                                <span className="truncate max-w-[300px] text-blue-400 underline decoration-blue-400/30 group-hover:decoration-blue-400">{s.title}</span>
                                            ) : (
                                                <span className="truncate max-w-[300px] text-gray-300 group-hover:text-white">{s.name}</span>
                                            )}
                                        </button>
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

            {/* Citation Viewer Modal */}
            {selectedCitation && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2 truncate">
                                {selectedCitation.type === 'web' ? 'Web Source' : 'Document Source'}
                                <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full font-normal truncate max-w-[200px]">
                                    {selectedCitation.title || selectedCitation.name}
                                </span>
                            </h3>
                            <button
                                onClick={() => setSelectedCitation(null)}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-[#111]">
                            <p className="whitespace-pre-wrap text-gray-300 leading-relaxed font-mono text-sm">
                                {selectedCitation.content || "No content available for this citation."}
                            </p>

                            {selectedCitation.type === 'web' && (
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <a
                                        href={selectedCitation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                                    >
                                        Visit original URL
                                        <ArrowUpRight className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


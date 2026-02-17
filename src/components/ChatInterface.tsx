"use client";

import { useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatInterfaceProps {
    documentId: string;
    documentName: string;
    onClose: () => void;
}

export default function ChatInterface({ documentId, documentName, onClose }: ChatInterfaceProps) {
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
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentId, question: userMessage }),
            });

            const data = await response.json();

            if (data.error) {
                setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
            } else {
                setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
            }
        } catch (error) {
            setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect to the server." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div>
                    <h3 className="font-bold text-lg text-white">Chatting with</h3>
                    <p className="text-sm text-gray-400 truncate max-w-[300px]">{documentName}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                >
                    Close
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="p-4 rounded-full bg-blue-500/10 text-blue-400">
                            <Bot className="h-8 w-8" />
                        </div>
                        <p className="text-gray-400 max-w-xs">Ask anything about the document. I&apos;ll analyze the content and answer your questions.</p>

                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${m.role === "user" ? "bg-blue-600 text-white" : "bg-white/10 text-purple-400"}`}>
                            {m.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                        </div>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"}`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 text-purple-400 flex items-center justify-center">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 rounded-tl-none flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
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

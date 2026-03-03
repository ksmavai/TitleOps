/**
 * AI Chat Panel — A slide-out sidebar powered by DeepSeek.
 * Contextually aware of the current page and system state.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
    X,
    Send,
    Sparkles,
    Loader2,
    Bot,
    User,
    Trash2,
} from "lucide-react";
import { sendChatMessage, type ChatMessage } from "@/lib/api";

interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const SUGGESTIONS: Record<string, string[]> = {
    "/": [
        "What does the telemetry chart show?",
        "Explain the system health metrics",
        "What happens when an incident is active?",
    ],
    "/simulations": [
        "What is the Redis timeout scenario?",
        "Which simulation has the biggest impact?",
        "Can I run multiple simulations at once?",
    ],
    "/post-mortem": [
        "How are post-mortems generated?",
        "What data does the AI use for reports?",
    ],
    "/integrations": [
        "Which integrations are connected?",
        "How does Datadog integration work?",
    ],
    "/settings": [
        "What settings can I configure?",
    ],
};

export function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
    const location = useLocation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async (text?: string) => {
        const msg = text || input.trim();
        if (!msg || isLoading) return;

        const userMsg: ChatMessage = { role: "user", content: msg };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // pass 'messages' instead of '[...messages, userMsg]' 
            // because the backend endpoint manually appends req.message to the history!
            const res = await sendChatMessage(msg, location.pathname, messages);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: res.reply },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I couldn't connect to the AI service. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const suggestions = SUGGESTIONS[location.pathname] || SUGGESTIONS["/"];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 360, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="flex flex-col bg-background border-l border-border/50 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 overflow-hidden flex-shrink-0 h-full"
                    style={{ willChange: "width, opacity" }}
                >
                    <div className="w-[360px] h-full flex flex-col flex-shrink-0 relative">
                        {/* Header */}
                        <div className="h-14 flex items-center justify-between px-5 border-b border-border/50 flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[0.875rem] font-semibold text-foreground leading-tight">
                                        TitleOps AI
                                    </h2>
                                    <p className="text-[0.625rem] text-muted-foreground leading-tight">
                                        Powered by DeepSeek
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {messages.length > 0 && (
                                    <button
                                        onClick={clearChat}
                                        className="skeu-icon-btn p-1.5 text-muted-foreground hover:text-foreground"
                                        title="Clear chat"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="skeu-icon-btn p-1.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-6">
                                    {/* Welcome */}
                                    <div className="text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-600/10 flex items-center justify-center mx-auto mb-3">
                                            <Sparkles className="w-7 h-7 text-violet-500" />
                                        </div>
                                        <p className="text-[0.9375rem] font-semibold text-foreground">
                                            Ask me anything
                                        </p>
                                        <p className="text-[0.75rem] text-muted-foreground mt-1 max-w-[280px]">
                                            I can explain dashboard components, incidents, telemetry data, and help you manage the AIOps pipeline.
                                        </p>
                                    </div>

                                    {/* Suggestions */}
                                    <div className="w-full space-y-2">
                                        <p className="text-[0.6875rem] text-muted-foreground font-medium uppercase tracking-wider px-1">
                                            Suggestions
                                        </p>
                                        {suggestions.map((suggestion, idx) => (
                                            <motion.button
                                                key={idx}
                                                onClick={() => handleSend(suggestion)}
                                                className="w-full text-left px-3.5 py-2.5 text-[0.8125rem] text-foreground skeu-gauge rounded-xl hover:bg-primary/5 transition-colors"
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <span className="text-primary mr-2">→</span>
                                                {suggestion}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`
                      max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[0.8125rem] leading-relaxed
                      ${msg.role === "user"
                                                ? "bg-primary text-white rounded-br-md"
                                                : "skeu-gauge text-foreground rounded-bl-md"
                                            }
                    `}
                                    >
                                        {msg.role === "assistant" ? (
                                            <div
                                                className="chat-message-content"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatMessage(msg.content),
                                                }}
                                            />
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <User className="w-3 h-3 text-primary" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2.5"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Bot className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="skeu-gauge px-4 py-3 rounded-2xl rounded-bl-md">
                                        <div className="flex gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-border/50 flex-shrink-0">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 skeu-inset rounded-xl overflow-hidden">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask anything..."
                                        rows={1}
                                        className="w-full bg-transparent px-3.5 py-2.5 text-[0.8125rem] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                                        style={{ maxHeight: "120px" }}
                                        disabled={isLoading}
                                    />
                                </div>
                                <motion.button
                                    onClick={() => handleSend()}
                                    className={`
                    w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                    ${input.trim() && !isLoading
                                            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm"
                                            : "skeu-gauge text-muted-foreground"
                                        }
                  `}
                                    whileTap={input.trim() && !isLoading ? { scale: 0.9 } : {}}
                                    disabled={!input.trim() || isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </motion.button>
                            </div>
                            <p className="text-[0.625rem] text-muted-foreground/50 mt-2 text-center">
                                TitleOps AI · Powered by DeepSeek
                            </p>
                        </div>
                    </div>
                </motion.aside>
            )
            }
        </AnimatePresence >
    );
}
/** Simple markdown-ish formatting for assistant messages */
function formatMessage(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, '<code class="bg-muted/50 px-1 py-0.5 rounded text-[0.75rem]">$1</code>')
        .replace(/^- (.+)/gm, '<li class="ml-3">$1</li>')
        .replace(/\n/g, "<br />");
}

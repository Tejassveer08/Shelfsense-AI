"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User, ArrowRight, CornerDownLeft } from "lucide-react";
import { ChatMessage, BookItem } from "@/lib/types";
import { chatRefine } from "@/lib/api";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: {
    query: string;
    sliders: any;
    filters: any;
  };
  onApplyUpdates: (updates: {
    query?: string;
    filters?: any;
    sliders?: any;
    results?: BookItem[];
  }) => void;
}

const QUICK_PROMPTS = [
  "More fast-paced and suspenseful",
  "Less dark, give me something heartwarming",
  "Shorter read, under 300 pages",
  "More philosophical and intellectual",
];

export function ChatDrawer({ isOpen, onClose, currentState, onApplyUpdates }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your ShelfSense librarian. Tell me how you'd like to refine your current recommendations (e.g. 'less dark', 'faster paced', 'shorter books'). Every message will dynamically update your book results!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await chatRefine({
        messages: newMessages,
        state: currentState,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);

      // Apply changes to the main results in place!
      onApplyUpdates({
        query: res.updated_query || undefined,
        filters: res.updated_filters || undefined,
        sliders: res.updated_sliders || undefined,
        results: res.results.length > 0 ? res.results : undefined,
      });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I ran into an issue refining the results: ${err.message}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border-library)] shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-library)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-amber)] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-[var(--text-primary)]">
                Conversational Refine
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Interactive real-time librarian
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[var(--accent-amber-glow)] text-[var(--accent-amber)] flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--accent-amber)] text-white rounded-tr-xs"
                    : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-library)] rounded-tl-xs"
                }`}
              >
                {m.content}
              </div>

              {m.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--accent-amber)] italic p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing intent and re-ranking the catalog...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="py-2 border-t border-[var(--border-library)]">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--bg-surface-elevated)] hover:bg-[var(--accent-amber)] hover:text-white text-[var(--text-muted)] border border-[var(--border-library)] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Refine (e.g. 'less depressing', 'more action')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-[var(--accent-amber)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

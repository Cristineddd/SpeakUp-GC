import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, X, Sparkles, Minimize2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";
import { generateAIResponse } from "../../services/gemini.service";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const STORAGE_KEY = "speakup_ai_widget_state_v1";

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi! I’m SpeakUp GC AI. I can help you navigate the app (filing a complaint, tracking a case, and how anonymity works). What do you need?",
    createdAt: Date.now(),
  }]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist open/minimized state (not the full conversation to avoid sensitive storage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.open === "boolean") setOpen(parsed.open);
      if (typeof parsed?.minimized === "boolean") setMinimized(parsed.minimized);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, minimized }));
    } catch {
      // ignore
    }
  }, [open, minimized]);

  useEffect(() => {
    if (!open || minimized) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [open, minimized, messages.length]);

  const historyForModel = useMemo(
    () =>
      messages
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map((m) => ({ isUser: m.role === "user", content: m.content })),
    [messages]
  );

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await generateAIResponse(trimmed, historyForModel);
      const aiMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: resp.text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const aiMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry — I couldn’t respond right now. Please try again in a moment.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-[60]">
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="group flex items-center gap-2 rounded-full bg-[#1a7a45] text-white px-4 py-3 shadow-lg hover:bg-[#155f36] transition-colors"
          aria-label="Open SpeakUp GC AI assistant"
        >
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold">SpeakUp GC AI</span>
          <Sparkles className="h-4 w-4 opacity-80" />
        </button>
      ) : (
        <Card className={cn(
          "w-[340px] sm:w-[380px] rounded-2xl border border-gray-200 shadow-xl bg-white overflow-hidden",
          minimized && "w-[280px]"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-[#e8f5ee] border border-[#1a7a45]/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-[#1a7a45]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">SpeakUp GC AI</p>
                <p className="text-[11px] text-gray-500">Assistant • Ctrl/⌘ + Enter to send</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMinimized((v) => !v)}
                aria-label={minimized ? "Expand assistant" : "Minimize assistant"}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!minimized && (
            <>
              <div ref={scrollRef} className="max-h-[380px] overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-[#1a7a45] text-white"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl px-3 py-2 text-sm bg-gray-100 text-gray-500">
                      Typing...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 p-3">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask me anything about filing, tracking, anonymity…"
                    className="min-h-[44px] max-h-[120px] resize-none"
                  />
                  <Button
                    type="button"
                    onClick={() => void send()}
                    disabled={loading || input.trim().length === 0}
                    className="bg-[#1a7a45] hover:bg-[#155f36] text-white"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  Tip: press Ctrl/⌘ + Enter to send.
                </p>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

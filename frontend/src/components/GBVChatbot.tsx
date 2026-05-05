"use client";

/**
 * GBVChatbot — Floating AI assistant (Laya) for the Know Your Rights Hub.
 * Uses Gemini API to answer GBV, legal rights, and reporting questions.
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Minimize2 } from "lucide-react";
import { cn } from "../lib/utils";
import { config } from "../config/api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_CONTEXT = `You are Laya, the compassionate AI assistant of SpeakUp GC — Gordon College's platform for reporting gender-based violence (GBV) and harassment complaints. You are trained to help students and staff understand their rights under Philippine law, specifically:

- RA 11313 (Safe Spaces Act)
- RA 7877 (Anti-Sexual Harassment Act)
- RA 9262 (VAWC Act)
- RA 10173 (Data Privacy Act)
- Gordon College CODI (Code of Internal Discipline and Integrity)

Your role:
1. Help users understand their legal rights and protections.
2. Guide users through the reporting process on SpeakUp GC.
3. Provide emotional support with empathy and care.
4. Clarify what counts as harassment, GBV, or sexual harassment under Philippine law.
5. Direct users to file a complaint if they describe an incident.
6. Never give formal legal advice — always recommend consulting a lawyer or the DEIU office for specific cases.

Keep responses concise (2–4 sentences unless more detail is truly needed), warm, and empowering. Never be dismissive. If a user seems in distress, acknowledge their feelings first before providing information. Always remind users that their identity is confidential on SpeakUp GC.`;

const SUGGESTIONS = [
  "What is the Safe Spaces Act?",
  "How do I file a complaint?",
  "Is my complaint anonymous?",
  "What counts as sexual harassment?",
];

async function callGemini(messages: Message[]): Promise<string> {
  const { apiKey, model, apiVersion, endpoint } = config.gemini;
  const url = `${endpoint}/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  // Prepend system context as first user turn
  contents.unshift({
    role: "user",
    parts: [{ text: SYSTEM_CONTEXT }],
  });
  contents.splice(1, 0, {
    role: "model",
    parts: [{ text: "Understood. I'm Laya, and I'm here to help. How can I support you today?" }],
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    }),
  });

  if (!res.ok) throw new Error("Gemini API error");
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm sorry, I couldn't generate a response. Please try again.";
}

export default function GBVChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! I'm **Laya**, your rights & reporting guide. Ask me anything about GBV laws, the complaint process, or your protections at Gordon College. 💚" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  // Hide greeting bubble after 6s or when chat opens
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");
    setShowBubble(false);

    const newMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await callGemini(newMessages);
      setMessages([...newMessages, { role: "assistant", text: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", text: "I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-ish bold renderer
  const renderText = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">

      {/* Greeting bubble */}
      {!open && showBubble && (
        <div className="bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-2.5 text-sm text-gray-700 max-w-[200px] text-center animate-bounce-slow">
          Ask Laya about your rights! 💚
          <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div className="w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "520px" }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f2d1a] to-[#1e5c38] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-[#1e5c38]">
              <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Laya</p>
              <p className="text-white/60 text-xs">GBV Rights Assistant · SpeakUp GC</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-[#1e5c38] border border-green-200">
                    <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#16A34A] text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                )}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#1e5c38] border border-green-200">
                  <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#16A34A]" />
                  <span className="text-xs text-gray-400">Laya is typing…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only on first message) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 bg-gray-50 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#16A34A]/40 text-[#15803D] bg-[#F0FDF4] hover:bg-green-100 transition-colors font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about your rights…"
              disabled={loading}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] disabled:opacity-50 placeholder-gray-400"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB toggle button */}
      <button
        onClick={() => { setOpen(!open); setShowBubble(false); }}
        className="relative w-20 h-20 hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open Laya AI chatbot"
      >
        <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-contain drop-shadow-2xl" />
        {!open && messages.length > 1 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}

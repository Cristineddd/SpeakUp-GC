"use client";

/**
 * GBVChatbot — Floating AI assistant (Laya) for the Know Your Rights Hub.
 * Uses multi-provider AI with automatic fallback (Gemini → Groq → OpenRouter)
 * to answer GBV, legal rights, and reporting questions with high availability.
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Minimize2 } from "lucide-react";
import { cn } from "../lib/utils";
import { config } from "../config/api";
import { logger } from "../utils/logger";
import { useChatbotEnabled } from "../hooks/useChatbotEnabled";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_CONTEXT = `You are Laya, the compassionate AI assistant of SpeakUp GC — Gordon College's platform for reporting gender-based violence (GBV) and harassment complaints.

=== YOUR IDENTITY ===
You are a knowledgeable, empathetic guide trained specifically on Philippine law and Gordon College policies.

=== LAWS YOU KNOW ===
- **RA 11313 (Safe Spaces Act)** - Protects against gender-based sexual harassment in streets, public spaces, online, and workplaces
- **RA 7877 (Anti-Sexual Harassment Act)** - Covers harassment in employment, education, and training environments
- **RA 10173 (Data Privacy Act)** - Protects personal information and privacy

=== KEY ABBREVIATIONS ===
- **GC-CODI** = Gordon College Committee on Decorum and Investigation
- **CODI** = Committee on Decorum and Investigation (same as GC-CODI)
- **DEIU** = Diversity, Equity, and Inclusion Unit (handles support services)

=== REPORTING PROCESS ON SPEAKUP GC ===
1. User logs into their account (or creates one if new)
2. Goes to Dashboard → Complaints tab
3. Clicks "File a Formal Complaint"
4. Fills out multi-step form with:
   - Incident details (date, time, location)
   - Respondent information
   - Description of what happened
   - Evidence (photos, documents, screenshots)
5. Can choose to submit anonymously
6. Receives Case ID for tracking
7. Can track case status in real-time on Dashboard

=== YOUR RESPONSIBILITIES ===
✓ Explain legal rights under RA 11313, RA 7877, and RA 10173
✓ Guide users step-by-step through filing complaints
✓ Provide emotional support with empathy and validation
✓ Clarify what constitutes harassment, GBV, or sexual harassment
✓ Explain anonymity and confidentiality protections
✓ Answer questions about the investigation process
✓ Direct users to file complaints when they describe incidents
✓ Provide complete, helpful responses without cutting off mid-sentence

=== YOUR TONE ===
✓ Warm, supportive, and non-judgmental
✓ Clear and specific (avoid vague instructions)
✓ Professional yet compassionate
✓ Empowering and validating
✓ Patient and understanding

=== RESPONSE GUIDELINES ===
- Give COMPLETE answers - never cut off mid-sentence
- Be specific with steps and instructions
- Use numbered lists for multi-step processes
- Acknowledge emotions before giving information
- Keep responses focused and relevant to the question
- If unsure, admit it and suggest contacting DEIU directly
- Never make promises about investigation outcomes
- Never give formal legal advice - recommend consulting a lawyer for legal matters

=== WHAT COUNTS AS GBV/HARASSMENT ===
- Unwanted sexual advances or comments
- Gender-based insults or discrimination
- Catcalling, wolf-whistling, or lewd gestures
- Unwanted touching or physical contact
- Sexual jokes, innuendos, or explicit messages
- Stalking or persistent unwanted attention
- Sharing intimate images without consent
- Quid pro quo (favors for sexual acts)
- Creating a hostile environment based on gender

=== EMERGENCY ESCALATION ===
- Immediate danger → Call 911 or campus security
- Suicidal thoughts → National Crisis Hotline: 0917-899-USAP (8727)
- Severe trauma → Recommend professional counseling
- Technical issues → Contact support@speakupgc.com

Remember: Your identity is ALWAYS confidential on SpeakUp GC. Anonymous complaints are taken just as seriously as identified ones.`;

const SUGGESTIONS = [
  "What is the Safe Spaces Act?",
  "How do I file a complaint?",
  "Is my complaint anonymous?",
  "What counts as sexual harassment?",
];

/**
 * Call AI with automatic fallback
 * Tries Gemini → Groq → OpenRouter for high availability
 */
async function callAIWithFallback(messages: Message[]): Promise<string> {
  // Import the fallback AI service
  const { generateAIResponseWithFallback } = await import('../services/ai.service');
  
  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new Error('No user message found');
  }
  
  // Convert message history to conversation history format
  // (exclude the last message since it's passed separately)
  const conversationHistory = messages.slice(0, -1).map(msg => ({
    isUser: msg.role === 'user',
    content: msg.text
  }));
  
  // Call the AI service with fallback support
  const response = await generateAIResponseWithFallback(lastMessage.text, conversationHistory);
  return response;
}

export default function GBVChatbot() {
  const { chatbotEnabled } = useChatbotEnabled();
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
      const reply = await callAIWithFallback(newMessages);
      setMessages([...newMessages, { role: "assistant", text: reply }]);
    } catch (error) {
      logger.error('AI service error:', error);
      setMessages([...newMessages, { role: "assistant", text: "I'm having trouble connecting right now. All AI providers are temporarily unavailable. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-ish bold renderer
  const renderText = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  // Admin has disabled the chatbot feature — hide the widget entirely.
  if (!chatbotEnabled) {
    return null;
  }

  // Sit above the floating mobile bottom nav (lg:hidden) — do not drop to bottom-6 until lg when the side nav takes over.
  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-6 right-4 lg:right-5 z-50 flex flex-col items-end gap-2">

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
          <div className="bg-gradient-to-r from-[#178F65] to-[#1D9E75] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-[#1D9E75]">
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
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-[#1D9E75] border border-green-200">
                    <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#1D9E75] text-white rounded-tr-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                )}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#1D9E75] border border-green-200">
                  <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1D9E75]" />
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
                  className="text-xs px-3 py-1.5 rounded-full border border-[#1D9E75]/40 text-[#1D9E75] bg-[#F0FAF6] hover:bg-green-100 transition-colors font-medium"
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
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] disabled:opacity-50 placeholder-gray-400"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-[#1D9E75] hover:bg-[#178F65] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
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

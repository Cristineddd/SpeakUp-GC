"use client";

/**
 * GBVChatbot — Floating AI assistant (Laya) for the Know Your Rights Hub.
 * Uses multi-provider AI with automatic fallback (Gemini → Groq → OpenRouter)
 * to answer GBV, legal rights, and reporting questions with high availability.
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Minimize2, History, Plus, Trash2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../lib/utils";
import { logger } from "../utils/logger";
import { useChatbotEnabled } from "../hooks/useChatbotEnabled";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteLayaConversation,
  getLayaConversation,
  listLayaConversations,
  saveLayaConversation,
  type LayaConversation,
  type LayaMessage,
} from "../services/layaChatService";

interface Message {
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
}

const WELCOME_MESSAGE =
  "Hi! I'm **Laya**, your rights & reporting guide. Ask me anything about GBV laws, the complaint process, or your protections at Gordon College. 💚";

const SUGGESTIONS = [
  "What is the Safe Spaces Act?",
  "How do I file a complaint?",
  "Is my complaint anonymous?",
  "What counts as sexual harassment?",
];

function welcomeMessages(): Message[] {
  return [{ role: "assistant", text: WELCOME_MESSAGE, createdAt: new Date().toISOString() }];
}

function activeChatKey(userId: string) {
  return `laya_active_chat_${userId}`;
}

async function callAIWithFallback(messages: Message[]): Promise<string> {
  const { generateAIResponseWithFallback } = await import('../services/ai.service');

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new Error('No user message found');
  }

  const conversationHistory = messages.slice(0, -1).map(msg => ({
    isUser: msg.role === 'user',
    content: msg.text
  }));

  return generateAIResponseWithFallback(lastMessage.text, conversationHistory);
}

export default function GBVChatbot() {
  const { chatbotEnabled } = useChatbotEnabled();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(welcomeMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<LayaConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      if (!historyOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages, historyOpen]);

  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const savedId = sessionStorage.getItem(activeChatKey(currentUser.uid));
    if (!savedId) return;

    getLayaConversation(savedId)
      .then((chat) => {
        if (!chat || chat.userId !== currentUser.uid) return;
        setConversationId(chat.id);
        setMessages(chat.messages.length ? chat.messages : welcomeMessages());
      })
      .catch((error) => logger.error('Failed to restore Laya chat:', error));
  }, [currentUser?.uid]);

  const refreshHistory = async () => {
    if (!currentUser?.uid) return;
    setHistoryLoading(true);
    try {
      setHistory(await listLayaConversations(currentUser.uid));
    } catch (error) {
      logger.error('Failed to load Laya history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const persistChat = async (nextMessages: Message[], existingId: string | null) => {
    if (!currentUser?.uid) return existingId;
    const toSave: LayaMessage[] = nextMessages.map((msg) => ({
      role: msg.role,
      text: msg.text,
      createdAt: msg.createdAt || new Date().toISOString(),
    }));
    const id = await saveLayaConversation({
      id: existingId,
      userId: currentUser.uid,
      messages: toSave,
    });
    setConversationId(id);
    sessionStorage.setItem(activeChatKey(currentUser.uid), id);
    return id;
  };

  const startNewChat = () => {
    setMessages(welcomeMessages());
    setConversationId(null);
    setHistoryOpen(false);
    if (currentUser?.uid) sessionStorage.removeItem(activeChatKey(currentUser.uid));
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    await refreshHistory();
  };

  const loadConversation = async (id: string) => {
    try {
      const chat = await getLayaConversation(id);
      if (!chat) return;
      setConversationId(chat.id);
      setMessages(chat.messages.length ? chat.messages : welcomeMessages());
      setHistoryOpen(false);
      if (currentUser?.uid) sessionStorage.setItem(activeChatKey(currentUser.uid), chat.id);
    } catch (error) {
      logger.error('Failed to open Laya chat:', error);
    }
  };

  const removeConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLayaConversation(id);
      setHistory((prev) => prev.filter((chat) => chat.id !== id));
      if (conversationId === id) startNewChat();
    } catch (error) {
      logger.error('Failed to delete Laya chat:', error);
    }
  };

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");
    setShowBubble(false);
    setHistoryOpen(false);

    const userMessage: Message = {
      role: "user",
      text: userText,
      createdAt: new Date().toISOString(),
    };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await callAIWithFallback(newMessages);
      const withReply: Message[] = [
        ...newMessages,
        { role: "assistant", text: reply, createdAt: new Date().toISOString() },
      ];
      setMessages(withReply);
      try {
        await persistChat(withReply, conversationId);
      } catch (saveError) {
        logger.error('Failed to save Laya chat:', saveError);
      }
    } catch (error) {
      logger.error('AI service error:', error);
      setMessages([...newMessages, {
        role: "assistant",
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderText = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  if (!chatbotEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-6 right-4 lg:right-5 z-50 flex flex-col items-end gap-2">

      {!open && showBubble && (
        <div className="bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-2.5 text-sm text-gray-700 max-w-[200px] text-center animate-bounce-slow">
          Ask Laya about your rights! 💚
          <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
        </div>
      )}

      {open && (
        <div className="w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "520px" }}>

          <div className="bg-gradient-to-r from-[#178F65] to-[#1D9E75] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-[#1D9E75]">
              <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Laya</p>
              <p className="text-white/60 text-xs">GBV Rights Assistant · SpeakUp GC</p>
            </div>
            {currentUser && (
              <>
                <button
                  onClick={startNewChat}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  title="New chat"
                  aria-label="New chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => (historyOpen ? setHistoryOpen(false) : void openHistory())}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    historyOpen ? "text-white bg-white/15" : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  title="Chat history"
                  aria-label="Chat history"
                >
                  <History className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Minimize chat"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {historyOpen ? (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white">
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#1D9E75]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to chat
                </button>
                <span className="text-xs text-gray-400">Saved chats</span>
              </div>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center px-6 py-12">
                  No saved chats yet. Send a message and it will show up here.
                </p>
              ) : (
                <div className="p-3 space-y-2">
                  {history.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => void loadConversation(chat.id)}
                      className={cn(
                        "w-full text-left rounded-2xl border px-3 py-2.5 transition-colors",
                        chat.id === conversationId
                          ? "border-[#1D9E75]/40 bg-[#F0FAF6]"
                          : "border-gray-200 bg-white hover:border-[#1D9E75]/30"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{chat.title}</p>
                          {chat.preview && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{chat.preview}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => void removeConversation(chat.id, e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void removeConversation(chat.id, e as unknown as React.MouseEvent);
                            }
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

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

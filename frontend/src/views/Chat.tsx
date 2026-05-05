import React, { useState, useRef, useEffect } from 'react';
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Bot, User, Send, Sparkles, Trash2, Archive, MoreVertical, X, Clock, ChevronLeft, ChevronRight, History, Image as ImageIcon, AlertCircle, Mic, Square } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import VoiceService from "../services/voiceService";

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
  imageAnalysis?: any;
  audioUrl?: string;
  voiceTranscript?: string;
  audioDuration?: number;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  isArchived: boolean;
  lastMessage: string;
  category?: 'general' | 'mental-health' | 'bullying' | 'academic' | 'safety' | 'relationships' | 'other';
};

const Chat: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Voice-related states (speech-to-text only)
  const [isListening, setIsListening] = useState(false);
  const [listeningTranscript, setListeningTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem('speakup_chat_sessions');
      const savedActiveId = localStorage.getItem('speakup_active_chat_id');
      
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        // Convert timestamp strings back to Date objects
        const chatsWithDates = parsedChats.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatSessions(chatsWithDates);
        
        if (savedActiveId && chatsWithDates.some((c: ChatSession) => c.id === savedActiveId)) {
          setActiveChatId(savedActiveId);
        } else if (chatsWithDates.length > 0) {
          setActiveChatId(chatsWithDates[0].id);
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setIsInitialized(true);
    }
  }, []);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && chatSessions.length > 0) {
      try {
        localStorage.setItem('speakup_chat_sessions', JSON.stringify(chatSessions));
      } catch (error) {
        console.error('Error saving chat sessions:', error);
      }
    }
  }, [chatSessions, isInitialized]);

  // Save active chat ID to localStorage
  useEffect(() => {
    if (isInitialized && activeChatId) {
      try {
        localStorage.setItem('speakup_active_chat_id', activeChatId);
      } catch (error) {
        console.error('Error saving active chat ID:', error);
      }
    }
  }, [activeChatId, isInitialized]);

  // Initialize with default chat if no chats exist (after loading from storage)
  useEffect(() => {
    if (isInitialized && chatSessions.length === 0) {
      const defaultChat: ChatSession = {
        id: 'default',
        title: 'New Chat',
        messages: [
          {
            id: '1',
            content: 'Hello! I\'m your SpeakUp GC AI Assistant. I\'m here to provide thoughtful, empathetic support and engage in meaningful conversations. How can I help you today?',
            isUser: false,
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        isArchived: false,
        lastMessage: 'Hello! I\'m your SpeakUp GC AI Assistant...'
      };
      setChatSessions([defaultChat]);
      setActiveChatId('default');
    }
  }, [isInitialized, chatSessions.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatSessions, activeChatId, isLoading]);

  const getActiveChat = () => {
    return chatSessions.find(chat => chat.id === activeChatId);
  };

  const generateChatTitle = (userInput: string) => {
    const words = userInput.split(' ').slice(0, 4);
    return words.join(' ') + (words.length === 4 ? '...' : '');
  };

  // Determine category based on chat content
  const determineChatCategory = (messages: Message[]): ChatSession['category'] => {
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    if (allText.match(/\b(bully|bullying|harass|harassment|mean|insult|mock|tease)\b/)) return 'bullying';
    if (allText.match(/\b(stress|anxiety|depression|sad|lonely|mental|health|emotion|feeling)\b/)) return 'mental-health';
    if (allText.match(/\b(school|exam|homework|grade|test|academic|study|subject)\b/)) return 'academic';
    if (allText.match(/\b(safe|danger|threat|risk|emergency|help|report|incident)\b/)) return 'safety';
    if (allText.match(/\b(friend|relationship|dating|crush|family|parent|love|break.*up)\b/)) return 'relationships';
    
    return 'general';
  };

  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'bullying': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'mental-health': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
      case 'academic': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case 'safety': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400';
      case 'relationships': return 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400';
      default: return 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-400';
    }
  };

  const getCategoryLabel = (category?: string): string => {
    switch (category) {
      case 'bullying': return '⚠️ Bullying';
      case 'mental-health': return '💭 Mental Health';
      case 'academic': return '📚 Academic';
      case 'safety': return '🛡️ Safety';
      case 'relationships': return '❤️ Relationships';
      default: return '💬 General';
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file (PNG, JPG, etc.)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear selected image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start listening for voice input (speech to text)
  const handleStartListening = async () => {
    try {
      if (!VoiceService.isSpeechRecognitionSupported()) {
        toast({
          title: "Not Supported",
          description: "Voice recognition is not supported on this device",
          variant: "destructive"
        });
        return;
      }

      setIsListening(true);
      setListeningTranscript('');

      VoiceService.startListening(
        (result) => {
          setListeningTranscript(result.transcript);
          if (result.isFinal) {
            setInput(prev => (prev ? prev + ' ' : '') + result.transcript);
          }
        },
        (error) => {
          console.error('Voice recognition error:', error);
          toast({
            title: "Listen Error",
            description: `Failed to recognize speech: ${error}`,
            variant: "destructive"
          });
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );

      toast({
        title: "Listening",
        description: "Speak now..."
      });
    } catch (error) {
      console.error('Error starting listening:', error);
      toast({
        title: "Listen Error",
        description: "Failed to start listening",
        variant: "destructive"
      });
      setIsListening(false);
    }
  };

  // Stop listening
  const handleStopListening = () => {
    VoiceService.stopListening();
    setIsListening(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userInput = input.trim();
    
    // Don't auto-analyze images - only if user explicitly asks
    if (selectedImage && !userInput) {
      toast({
        title: "Add a message",
        description: "Please type a message to send with your image. Tip: Type 'analyze' or 'check this' to analyze the image for bullying.",
        variant: "destructive"
      });
      return;
    }
    
    if (!userInput && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: userInput,
      isUser: true,
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
    };

    let updatedSessions = [...chatSessions];
    let currentChat = getActiveChat();

    // Create new chat if no active chat or starting fresh
    if (!currentChat || activeChatId === 'default') {
      const newChat: ChatSession = {
        id: Date.now().toString(),
        title: generateChatTitle(userInput),
        messages: [userMessage],
        createdAt: new Date(),
        isArchived: false,
        lastMessage: userInput,
        category: determineChatCategory([userMessage])
      };
      updatedSessions = [newChat, ...updatedSessions.filter(chat => chat.id !== 'default')];
      setActiveChatId(newChat.id);
    } else {
      // Add to existing chat
      updatedSessions = updatedSessions.map(chat =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              lastMessage: userInput,
              // Update category if not already set
              category: chat.category || determineChatCategory([...chat.messages, userMessage])
            }
          : chat
      );
    }

    setChatSessions(updatedSessions);
    setInput('');
    const currentImage = selectedImage;
    clearImage(); // Clear image after sending
    setIsLoading(true);

    // Check if user wants image analysis (explicit keywords)
    const shouldAnalyzeImage = currentImage && (
      userInput.toLowerCase().includes('analyze') ||
      userInput.toLowerCase().includes('check') ||
      userInput.toLowerCase().includes('scan') ||
      userInput.toLowerCase().includes('detect') ||
      userInput.toLowerCase().includes('inspect') ||
      userInput.toLowerCase().includes('what') ||
      userInput.toLowerCase().includes('bullying') ||
      userInput.toLowerCase().includes('harassment')
    );

    setIsAnalyzing(shouldAnalyzeImage);

    try {
      let aiResponse = '';
      let analysisResult = null;

      // Only analyze image if user explicitly asked
      if (shouldAnalyzeImage && currentImage) {
        toast({
          title: "Analyzing Image",
          description: "Checking image for signs of bullying or harassment...",
        });

        const { analyzeImageForBullying, generateAnalysisExplanation } = await import('../services/gemini-vision.service');
        analysisResult = await analyzeImageForBullying(currentImage);
        aiResponse = generateAnalysisExplanation(analysisResult);
        
        // Add extra context if bullying/harassment detected
        if (analysisResult.isBullying || analysisResult.isHarassment) {
          toast({
            title: "⚠️ Potential Issue Detected",
            description: `Severity: ${analysisResult.severity.toUpperCase()}`,
            variant: "destructive",
          });
        }
      } else {
        // Regular text-only chat
        const { generateAIResponse } = await import('../services/gemini.service');
        
        // Get current chat for context
        const currentChatSession = updatedSessions.find(chat => 
          chat.id === (activeChatId === 'default' ? updatedSessions[0]?.id : activeChatId)
        );
        
        // Pass full conversation history to AI
        const response = await generateAIResponse(userInput, currentChatSession?.messages || []);
        aiResponse = response.text;
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
        imageAnalysis: analysisResult,
      };
      
      setChatSessions(prev =>
        prev.map(chat =>
          chat.id === (activeChatId === 'default' ? updatedSessions[0].id : activeChatId)
            ? {
                ...chat,
                messages: [...chat.messages, botMessage],
                lastMessage: (typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse)).substring(0, 50) + '...'
              }
            : chat
        )
      );
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };
      
      setChatSessions(prev =>
        prev.map(chat =>
          chat.id === (activeChatId === 'default' ? updatedSessions[0].id : activeChatId)
            ? {
                ...chat,
                messages: [...chat.messages, errorMessage],
                lastMessage: "Error: Couldn't get response"
              }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: '1',
          content: 'Hello! I\'m your SpeakUp GC AI Assistant. I\'m here to provide thoughtful, empathetic support and engage in meaningful conversations. How can I help you today?',
          isUser: false,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      isArchived: false,
      lastMessage: 'Hello! I\'m your SpeakUp GC AI Assistant...',
      category: undefined
    };
    setChatSessions(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setShowChatHistory(false);
  };

  const archiveChat = (chatId: string) => {
    setChatSessions(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, isArchived: true } : chat
      )
    );
  };

  const deleteChat = (chatId: string) => {
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatId === chatId && chatSessions.length > 1) {
      const remainingChats = chatSessions.filter(chat => chat.id !== chatId);
      setActiveChatId(remainingChats[0]?.id || '');
    }
  };

  const unarchiveChat = (chatId: string) => {
    setChatSessions(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, isArchived: false } : chat
      )
    );
  };

  const activeChats = chatSessions.filter(chat => !chat.isArchived);
  const archivedChats = chatSessions.filter(chat => chat.isArchived);

  const suggestedQuestions = [
    "I'm feeling stressed and overwhelmed",
    "Can you help me with sleep problems?",
    "I'm having a hard day, need support",
    "What are some quick self-care tips?",
    "How do I deal with anxiety?",
    "I'm feeling lonely and sad"
  ];

  const handleSuggestedQuestion = async (question: string) => {
    await handleSubmit(new Event('submit') as any);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Chat History Sidebar */}
      <div className={`${isHistoryCollapsed ? 'w-0' : 'w-64 sm:w-72 md:w-80 lg:w-96'} border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col transition-all duration-300 ${showChatHistory ? 'absolute md:relative inset-0 md:inset-auto z-30' : 'hidden md:flex'} overflow-hidden`}>
        {/* Sticky Header Section */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">Chat History</h2>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={createNewChat}
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium transition-colors text-xs p-1.5 sm:p-2"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline text-xs sm:text-sm">New</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHistoryCollapsed(true)}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hidden sm:flex p-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex-1 p-2 sm:p-3">
            {/* Active Chats */}
            <div className="space-y-1.5">
              {activeChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group p-2 sm:p-3 rounded-md sm:rounded-lg cursor-pointer transition-colors text-xs sm:text-sm ${
                    activeChatId === chat.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setShowChatHistory(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate text-xs sm:text-sm">
                        {chat.title}
                      </h3>
                    </div>
                    <div className="flex space-x-0.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveChat(chat.id);
                        }}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all"
                        title="Archive chat"
                      >
                        <Archive className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                        title="Delete chat"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {chat.category && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryColor(chat.category)}`}>
                        {getCategoryLabel(chat.category)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 line-clamp-1">
                    {chat.lastMessage}
                  </p>
                </div>
              ))}
            </div>

            {/* Archived Chats Section */}
            {archivedChats.length > 0 && (
              <div className="mt-4 sm:mt-6">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 px-2">Archived</h3>
                <div className="space-y-1.5">
                  {archivedChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-2 sm:p-3 rounded-md sm:rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate text-xs sm:text-sm">
                            {chat.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {chat.lastMessage}
                          </p>
                          <div className="flex items-center mt-1 text-xs text-gray-400 dark:text-gray-500">
                            <Clock className="h-3 w-3 mr-0.5" />
                            {formatDate(chat.createdAt)}
                          </div>
                        </div>
                        <div className="flex space-x-0.5 ml-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unarchiveChat(chat.id)}
                            className="h-5 w-5 p-0 text-gray-400 hover:text-green-500 transition-colors"
                            title="Unarchive chat"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteChat(chat.id)}
                            className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete chat permanently"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header - STICKY at top during scroll */}
        <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 sm:p-3 shadow-md">
          <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="md:hidden hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 flex-shrink-0 p-1.5"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {/* Desktop history toggle */}
              {isHistoryCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHistoryCollapsed(false)}
                  className="hidden md:flex border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-600 transition-all shadow-sm font-medium flex-shrink-0 text-xs px-2"
                >
                  <History className="h-3 w-3 mr-1" />
                  History
                </Button>
              )}

              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-green-500 shadow-lg flex items-center justify-center ring-2 ring-green-400/20 flex-shrink-0">
                <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-white" />
              </div>
              
              {/* Current chat title */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                  SpeakUp GC AI
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center flex-shrink-0">
                  <span className="w-0.5 h-0.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  <span className="hidden sm:inline text-xs">Online</span>
                </div>
              </div>
            </div>
            
            {/* New Chat button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-green-500 text-white border-2 border-green-500 hover:bg-green-600 hover:border-green-600 shadow-md hover:shadow-lg transition-all font-medium text-xs px-2 sm:px-3 py-1.5 flex-shrink-0"
              onClick={createNewChat}
            >
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>

        {/* Chat Area - Scrollable */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-2 sm:p-3 md:p-4 h-full overflow-y-auto">
            <div className="max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto">
            {/* Welcome screen */}
            {getActiveChat()?.messages.length === 1 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] px-3 sm:px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-green-500 shadow-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 ring-4 ring-green-400/30 animate-pulse">
                  <Bot className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white" />
                </div>
                <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">SpeakUp GC AI</h1>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 md:mb-6 text-center px-2">Your supportive companion, always here to listen</p>
                
                {/* Suggestion cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 w-full max-w-2xl">
                  {suggestedQuestions.slice(0, 4).map((question, i) => (
                    <button
                      key={i}
                      className="p-2.5 sm:p-3 md:p-4 text-left text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group shadow-sm hover:shadow-md"
                      onClick={() => {
                        setInput(question);
                        setTimeout(() => handleSubmit(new Event('submit') as any), 100);
                      }}
                    >
                      <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
                        {question}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Messages */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {getActiveChat()?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-1.5 sm:gap-2 md:gap-3 ${
                    message.isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!message.isUser && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-green-500 shadow-md flex items-center justify-center flex-shrink-0 ring-2 ring-green-400/20">
                      <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 max-w-xs sm:max-w-sm md:max-w-prose shadow-sm text-xs sm:text-sm ${
                      message.isUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Show image if present */}
                    {message.imageUrl && (
                      <div className="mb-2">
                        <img 
                          src={message.imageUrl} 
                          alt="Uploaded content" 
                          className="rounded-lg max-w-xs max-h-64 object-cover"
                        />
                      </div>
                    )}
                    {/* Show analysis badge if bullying detected */}
                    {message.imageAnalysis && (message.imageAnalysis.isBullying || message.imageAnalysis.isHarassment) && (
                      <div className={`mb-2 px-2 py-1 rounded text-xs font-medium inline-block ${
                        message.imageAnalysis.severity === 'critical' ? 'bg-red-500 text-white' :
                        message.imageAnalysis.severity === 'high' ? 'bg-orange-500 text-white' :
                        message.imageAnalysis.severity === 'medium' ? 'bg-yellow-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        <AlertCircle className="h-2.5 w-2.5 inline mr-0.5" />
                        {message.imageAnalysis.category} - {message.imageAnalysis.severity.toUpperCase()}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  </div>
                  {message.isUser && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-blue-500 shadow-md flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3 animate-fadeIn">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-green-500 shadow-md flex items-center justify-center flex-shrink-0 ring-2 ring-green-400/20">
                    <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-white" />
                  </div>
                  <div className="rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex space-x-1.5 items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    {isAnalyzing && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                        Analyzing image...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            </div>
          </div>
        </ScrollArea>

        {/* Input Area - STICKY with z-index below header */}
        <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 sm:p-3 shadow-lg">
          <div className="max-w-full sm:max-w-3xl md:max-w-4xl mx-auto px-1 sm:px-0">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-2 sm:mb-3 relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Selected" 
                  className="max-h-20 sm:max-h-24 md:max-h-32 rounded-lg sm:rounded-xl border-2 border-green-500 shadow-lg"
                />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 sm:p-1 hover:bg-red-600 shadow-lg transition-colors"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium truncate max-w-20 sm:max-w-none">
                  {selectedImage?.name}
                </div>
              </div>
            )}

            {/* Voice Controls Info */}
            {isListening && (
              <div className="mb-2 sm:mb-3 bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-3 rounded-lg border-2 border-purple-500">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-400">
                    Listening...
                  </p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 flex-wrap">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Image upload button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isAnalyzing || isListening}
                className="flex-shrink-0 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 transition-colors px-1.5 sm:px-2 md:px-3"
                title="Upload image for analysis"
              >
                <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
              </Button>

              {/* Speech-to-Text Button */}
              {!isListening && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartListening}
                  disabled={isLoading || isAnalyzing}
                  className="flex-shrink-0 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-500 transition-colors px-1.5 sm:px-2 md:px-3"
                  title="Speech to text"
                >
                  <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                </Button>
              )}

              {/* Stop Listen Button */}
              {isListening && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStopListening}
                  className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 px-1.5 sm:px-2 md:px-3"
                  title="Stop listening"
                >
                  <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                </Button>
              )}
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedImage ? "Add message..." : isListening ? "Listening..." : "Type message..."}
                className="flex-1 min-w-0 rounded-md sm:rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                disabled={isLoading || isAnalyzing}
              />
              <Button 
                type="submit" 
                disabled={isLoading || isAnalyzing || (!input.trim() && !selectedImage)}
                className="flex-shrink-0 bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-0.5 sm:mr-1"></div>
                    <span className="hidden sm:inline text-xs">Analyzing</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline text-xs">Send</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile overlay for chat history */}
      {showChatHistory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setShowChatHistory(false)}
        />
      )}
    </div>
  );
};

export default Chat;
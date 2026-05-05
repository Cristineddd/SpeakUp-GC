/**
 * ChatInterface Component
 * Main chat UI with real-time messaging
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '../../compat/router';
import { useAuth } from '../../contexts/AuthContext';
import { MessageService } from '../../services/messageService';
import { MessageBubble, TypingIndicator, DateSeparator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import {
  MessageCircle,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Shield,
  ChevronDown,
  FileText,
} from 'lucide-react';
import type { Message, ChatRoom, MessageAttachment } from '../../types/message';
import { format, isSameDay } from 'date-fns';

interface ChatInterfaceProps {
  complaintId: string;
  complaintTitle: string;
  onClose?: () => void;
  className?: string;
}

export function ChatInterface({
  complaintId,
  complaintTitle,
  onClose,
  className = '',
}: ChatInterfaceProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get user role from currentUser or use default
  const userRole = currentUser?.role || 'complainant'; // Default to complainant if no role
  const isHandler = userRole === 'handler' || chatRoom?.handlerId === currentUser?.uid;
  const isComplainant = userRole === 'complainant';

  // Initialize chat room and subscribe to messages
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeMessages: (() => void) | undefined;
    let unsubscribeChatRoom: (() => void) | undefined;

    const initChat = async () => {
      try {
        setLoading(true);

        // Get or create chat room
        const existingRoom = await MessageService.getChatRoomByComplaint(complaintId);
        
        let room: ChatRoom;
        if (existingRoom) {
          room = existingRoom;
        } else {
          // Create new chat room
          room = await MessageService.getOrCreateChatRoom(
            complaintId,
            complaintTitle,
            currentUser.uid,
            currentUser.displayName || currentUser.email || 'User',
            userRole
          );
        }

        setChatRoom(room);

        // Subscribe to messages
        unsubscribeMessages = MessageService.subscribeToMessages(
          room.id,
          (newMessages) => {
            setMessages(newMessages);
            
            // Mark messages as read
            newMessages.forEach((msg) => {
              if (msg.senderId !== currentUser.uid && !msg.readBy.includes(currentUser.uid)) {
                MessageService.markMessageAsRead(msg.id, currentUser.uid);
              }
            });
            
            // Scroll to bottom only if user is already at bottom (Messenger-like behavior)
            setTimeout(() => scrollToBottom(), 100);
          }
        );

        // Subscribe to chat room updates
        unsubscribeChatRoom = MessageService.subscribeToChatRoom(
          room.id,
          (updatedRoom) => {
            setChatRoom(updatedRoom);
            
            // Update typing users (exclude current user)
            const otherTypingUsers = updatedRoom.typingUsers
              .filter((userId) => userId !== currentUser.uid)
              .map((userId) => {
                const participant = updatedRoom.participants[userId];
                return participant?.name || 'Someone';
              });
            
            setTypingUsers(otherTypingUsers);
          }
        );

        // Mark all as read
        await MessageService.markAllAsRead(room.id, currentUser.uid);

      } catch (error) {
        console.error('Error initializing chat:', error);
        toast({
          title: 'Chat Error',
          description: 'Failed to load chat. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeChatRoom) unsubscribeChatRoom();
    };
  }, [complaintId, currentUser, userRole]);

  // Scroll to bottom (only if user is at bottom)
  const scrollToBottom = () => {
    if (!isUserScrolling && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Check if user is at the bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
    
    setIsUserScrolling(!isAtBottom);
  };

  // Handle send message
  const handleSendMessage = async (content: string, attachments?: MessageAttachment[]) => {
    if (!currentUser || !chatRoom) return;

    try {
      let senderRole: 'complainant' | 'handler';
      
      if (userRole === 'handler') {
        senderRole = 'handler';
      } else if (userRole === 'complainant') {
        senderRole = 'complainant';
      } else {
        senderRole = chatRoom.handlerId === currentUser.uid ? 'handler' : 'complainant';
      }

      await MessageService.sendMessage(
        chatRoom.id,
        complaintId,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'User',
        senderRole,
        content,
        attachments
      );

      // Stop typing indicator
      await MessageService.setTyping(
        chatRoom.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'User',
        false
      );

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Handle typing indicator
  const handleTyping = async (isTyping: boolean) => {
    if (!currentUser || !chatRoom) return;

    try {
      await MessageService.setTyping(
        chatRoom.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'User',
        isTyping
      );
    } catch (error) {
      console.error('Error setting typing:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File): Promise<MessageAttachment> => {
    if (!chatRoom) {
      throw new Error('Chat room not initialized');
    }

    try {
      const attachment = await MessageService.uploadAttachment(
        file,
        chatRoom.id,
        currentUser!.uid
      );
      return attachment;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: Date; messages: Message[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      let messageDate: Date;
      if (message.createdAt && typeof message.createdAt === 'object' && 'toDate' in message.createdAt) {
        messageDate = message.createdAt.toDate();
      } else {
        messageDate = new Date(message.createdAt as string);
      }
      
      if (!currentDate || !isSameDay(messageDate, currentDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-xs text-gray-600">Loading chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chatRoom) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Failed to Load Chat
          </h3>
          <p className="text-sm text-gray-600">
            Unable to initialize chat room. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <Card className={`flex flex-col h-screen ${className}`}>
      <CardHeader className="border-b p-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              {/* SIMPLE STATUS INFO LANG - WALANG TITLE */}
              <div className="flex items-center gap-2">
                {/* Current user role */}
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    isHandler 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-green-50 text-green-700 border-green-200'
                  }`}
                >
                  {isHandler ? (
                    <Shield className="h-3 w-3 mr-1" />
                  ) : (
                    <User className="h-3 w-3 mr-1" />
                  )}
                  {isHandler ? 'Case Handler' : 'Complainant'}
                </Badge>

                {/* Handler info for complainants only */}
                {isComplainant && chatRoom.handlerId && chatRoom.handlerName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>•</span>
                    <span>Handler: {chatRoom.handlerName}</span>
                  </div>
                )}

                {/* Pending status for complainants */}
                {isComplainant && !chatRoom.handlerId && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Awaiting Handler
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* File Formal Complaint Button */}
            {isComplainant && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white text-xs px-2 whitespace-nowrap flex items-center gap-1 h-8"
                onClick={() => navigate('/complaints/new')}
                title="File a formal complaint"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">File Complaint</span>
                <span className="sm:hidden">File</span>
              </Button>
            )}
            
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages area */}
      <div className="flex-1 relative">
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto p-3 space-y-0.5 bg-gradient-to-b from-gray-50 to-white" 
        >
        {messageGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              No Messages Yet
            </h3>
            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
              {isHandler 
                ? 'Start the conversation by introducing yourself to the complainant.'
                : 'Start a conversation by sending a message below.'}
            </p>
          </div>
        ) : (
          <>
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <DateSeparator date={group.date} />
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === currentUser?.uid}
                    showSenderName={true}
                    isGroupChat={chatRoom.participantIds.length > 2}
                  />
                ))}
              </div>
            ))}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator userNames={typingUsers} />
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
        </div>

        {/* Scroll to bottom button */}
        {isUserScrolling && (
          <Button
            onClick={() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                setIsUserScrolling(false);
              }
            }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            New Messages
          </Button>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onFileUpload={handleFileUpload}
          disabled={!chatRoom.isActive}
          placeholder={
            chatRoom.isActive
              ? (isHandler ? 'Type your response...' : 'Type a message...')
              : 'This chat has been closed'
          }
          allowAttachments={chatRoom.settings?.allowAttachments}
          maxAttachments={5}
        />
      </div>
    </Card>
  );
}
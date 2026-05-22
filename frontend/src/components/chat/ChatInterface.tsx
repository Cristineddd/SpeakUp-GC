/**
 * ChatInterface Component
 * Main chat UI with real-time messaging
 */

import { useState, useEffect, useRef } from 'react';
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
  
  // DEBUG: Log handler status
  console.log('🔍 [CHAT] User role:', userRole);
  console.log('🔍 [CHAT] Is handler:', isHandler);
  console.log('🔍 [CHAT] Current user ID:', currentUser?.uid);
  console.log('🔍 [CHAT] Chat room handler ID:', chatRoom?.handlerId);

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
            
            // Auto-scroll to bottom on new messages
            requestAnimationFrame(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              }
            });
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

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

      // Scroll to bottom after sending
      setIsUserScrolling(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        });
      });

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
    <Card className={`flex flex-col h-full bg-transparent overflow-hidden ${className}`}>
      {/* Only show header when used as standalone (with onClose) */}
      {onClose && (
        <CardHeader className="border-b px-3 py-2.5 flex-shrink-0 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-[#1a7a45] to-emerald-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      variant="outline" 
                      className={`text-[11px] px-2 py-0.5 ${
                        isHandler 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {isHandler ? (
                        <Shield className="h-3 w-3 mr-0.5" />
                      ) : (
                        <User className="h-3 w-3 mr-0.5" />
                      )}
                      {isHandler ? 'Handler' : 'Complainant'}
                    </Badge>

                    {/* Handler info for complainants only */}
                    {isComplainant && chatRoom.handlerId && chatRoom.handlerName && (
                      <span className="text-[11px] text-gray-600">{chatRoom.handlerName}</span>
                    )}

                    {/* Pending status for complainants */}
                    {isComplainant && !chatRoom.handlerId && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-yellow-50 text-yellow-700">
                        <AlertCircle className="h-3 w-3 mr-0.5" />
                        Waiting
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      {/* Messages area */}
      <div className="flex-1 min-h-0 relative">
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-3 py-3 space-y-1 bg-gradient-to-b from-green-50/30 to-white"
        >
        {messageGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <MessageCircle className="h-7 w-7 text-[#1a7a45]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No Messages Yet
            </h3>
            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
              {isHandler 
                ? 'Start the conversation by introducing yourself to the complainant.'
                : 'Welcome to the case chat. A handler will respond to you shortly.'}
            </p>
          </div>
        ) : (
          <>
            {messageGroups.map((group, groupIndex) => {
              const groupedMessages = group.messages;
              
              // Helper to convert timestamp to Date
              const toDate = (timestamp: any): Date => {
                if (!timestamp) return new Date();
                if (timestamp.toDate) return timestamp.toDate();
                return new Date(timestamp);
              };
              
              // Determine group position for each message
              const getGroupPosition = (index: number): 'single' | 'first' | 'middle' | 'last' => {
                const currentMsg = groupedMessages[index];
                const prevMsg = index > 0 ? groupedMessages[index - 1] : null;
                const nextMsg = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;
                
                // Check if messages are from same sender and within 2 minutes
                const isSameSenderAsPrev = prevMsg && prevMsg.senderId === currentMsg.senderId &&
                  Math.abs(toDate(currentMsg.createdAt).getTime() - toDate(prevMsg.createdAt).getTime()) < 120000;
                          
                const isSameSenderAsNext = nextMsg && nextMsg.senderId === currentMsg.senderId &&
                  Math.abs(toDate(nextMsg.createdAt).getTime() - toDate(currentMsg.createdAt).getTime()) < 120000;
                
                if (!isSameSenderAsPrev && !isSameSenderAsNext) return 'single';
                if (isSameSenderAsPrev && isSameSenderAsNext) return 'middle';
                if (!isSameSenderAsPrev && isSameSenderAsNext) return 'first';
                return 'last';
              };
              
              return (
                <div key={groupIndex}>
                  <DateSeparator date={group.date} />
                  {groupedMessages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.senderId === currentUser?.uid}
                      showSenderName={true}
                      isGroupChat={chatRoom.participantIds.length > 2}
                      groupPosition={getGroupPosition(index)}
                    />
                  ))}
                </div>
              );
            })}
            
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
              const el = messagesContainerRef.current;
              if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
              }
              setIsUserScrolling(false);
            }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg bg-[#1a7a45] hover:bg-emerald-700 text-white"
            size="sm"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            New Messages
          </Button>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0">
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
          showQuickResponses={isHandler}
        />
      </div>
    </Card>
  );
}
/**
 * ChatInterface Component
 * Main chat UI with real-time messaging
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageService } from '../../services/messageService';
import { NotificationService } from '../../services/notificationService';
import { MessageBubble, TypingIndicator, DateSeparator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import {
  MessageCircle,
  X,
  AlertCircle,
  Loader2,
  Shield,
  ChevronDown,
} from 'lucide-react';
import type { Message, ChatRoom, MessageAttachment } from '../../types/message';
import { isSameDay } from 'date-fns';

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

  // Initialize chat room and subscribe to messages
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeMessages: (() => void) | undefined;
    let unsubscribeChatRoom: (() => void) | undefined;

    const initChat = async () => {
      try {
        setLoading(true);

        // Get or create chat room
        const existingRoom = await MessageService.getChatRoomByComplaint(
          complaintId,
          currentUser.uid
        );
        
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
            undefined,
            undefined,
            { requestingUserId: currentUser.uid }
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
                void MessageService.markMessageAsRead(msg.id, currentUser.uid);
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

        setLoading(false);

        void Promise.all([
          MessageService.markAllAsRead(room.id, currentUser.uid),
          NotificationService.markComplaintNotificationsAsRead(currentUser.uid, complaintId),
        ]).catch((readError) => {
          console.warn('Could not fully clear unread state for chat:', readError);
        });

      } catch (error) {
        console.error('Error initializing chat:', error);
        toast({
          title: 'Chat Error',
          description: 'Failed to load chat. Please try again.',
          variant: 'destructive',
        });
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
  const handlerDisplayName = chatRoom.handlerName || 'Case Support';
  const handlerInitial = handlerDisplayName.charAt(0).toUpperCase();
  const hasAssignedHandler = Boolean(chatRoom.handlerId);

  return (
    <div className={`flex h-full min-h-0 w-full flex-col ${className}`}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-col px-2 pb-2 pt-1 sm:px-3">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Messenger-style header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-gradient-to-r from-white to-emerald-50/30 px-3 py-2.5 sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0d7a5c] to-[#1D9E75] text-sm font-bold text-white shadow-md ring-2 ring-white">
                {hasAssignedHandler ? handlerInitial : <Shield className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-gray-900">
                  {hasAssignedHandler ? handlerDisplayName : 'Waiting for handler'}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {complaintTitle}
                  {!hasAssignedHandler && (
                    <>
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="text-amber-600">A CODI member will join soon</span>
                    </>
                  )}
                </p>
              </div>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-9 w-9 shrink-0 rounded-full"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Messages area */}
            <div
              className="relative min-h-0 flex-1"
              style={{
                backgroundColor: '#eef2f6',
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.15) 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            >
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                {messageGroups.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200/80">
                      <MessageCircle className="h-8 w-8 text-[#1D9E75]" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">No messages yet</p>
                    <p className="mt-1 max-w-xs text-xs text-gray-500">
                      {isHandler
                        ? 'Start the conversation by introducing yourself to the complainant.'
                        : 'Welcome to your case chat. A handler will respond to you shortly.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 px-3 py-3 sm:px-4">
                    {messageGroups.map((group, groupIndex) => {
                      const groupedMessages = group.messages;

                      const toDate = (timestamp: any): Date => {
                        if (!timestamp) return new Date();
                        if (timestamp.toDate) return timestamp.toDate();
                        return new Date(timestamp);
                      };

                      const getGroupPosition = (index: number): 'single' | 'first' | 'middle' | 'last' => {
                        const currentMsg = groupedMessages[index];
                        const prevMsg = index > 0 ? groupedMessages[index - 1] : null;
                        const nextMsg = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;

                        const isSameSenderAsPrev =
                          prevMsg &&
                          prevMsg.senderId === currentMsg.senderId &&
                          Math.abs(toDate(currentMsg.createdAt).getTime() - toDate(prevMsg.createdAt).getTime()) < 120000;

                        const isSameSenderAsNext =
                          nextMsg &&
                          nextMsg.senderId === currentMsg.senderId &&
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
                              showSenderName={message.senderId !== currentUser?.uid}
                              isGroupChat={chatRoom.participantIds.length > 2}
                              groupPosition={getGroupPosition(index)}
                            />
                          ))}
                        </div>
                      );
                    })}

                    {typingUsers.length > 0 && <TypingIndicator userNames={typingUsers} />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {isUserScrolling && (
                <Button
                  onClick={() => {
                    const el = messagesContainerRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                    setIsUserScrolling(false);
                  }}
                  className="absolute bottom-20 left-1/2 z-10 h-8 -translate-x-1/2 rounded-full bg-[#1D9E75] px-3 text-xs text-white shadow-md hover:bg-emerald-700"
                  size="sm"
                >
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  New messages
                </Button>
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm">
              <ChatInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onFileUpload={handleFileUpload}
                disabled={!chatRoom.isActive}
                placeholder={chatRoom.isActive ? 'Aa' : 'This chat has been closed'}
                allowAttachments={chatRoom.settings?.allowAttachments}
                maxAttachments={5}
                showQuickResponses={isHandler}
                embedded
                messengerStyle
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
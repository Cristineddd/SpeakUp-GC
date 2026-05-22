import { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertCircle,
  Loader2,
  User,
  FileText,
  MapPin,
  Calendar,
  Clock,
  Flag,
  Mail,
  ChevronDown,
  ChevronUp,
  Flame,
  MailX,
  Info,
  Shield,
  Tag,
  FileQuestion,
} from 'lucide-react';
import type { Message, ChatRoom, MessageAttachment } from '../../types/message';
import { isSameDay } from 'date-fns';

// Extended interface to include all possible properties
interface ExtendedAdminReport {
  id: string;
  title: string;
  description?: string;
  category?: string;
  severity?: string;
  status?: string;
  location?: string;
  incidentDate?: string;
  reportedAt?: string;
  
  // All possible property names for flexibility
  complainantId?: string;
  complainantName?: string;
  complainantEmail?: string;
  incidentLocation?: string;
  createdAt?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

interface HandlerChatInterfaceProps {
  complaintId: string;
  complaint: ExtendedAdminReport;
  onClose?: () => void;
  className?: string;
}

// Helper function for safe property access
const getSafeProperty = <T,>(
  obj: any, 
  primaryKey: string, 
  fallbackKey: string, 
  defaultValue: T
): T => {
  return obj?.[primaryKey] || obj?.[fallbackKey] || defaultValue;
};

export function HandlerChatInterface({
  complaintId,
  complaint,
  onClose,
  className = '',
}: HandlerChatInterfaceProps) {
  const { currentUser } = useAuth();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const [showCaseDetails, setShowCaseDetails] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<() => void>(() => {});
  const { toast } = useToast();

  // Check if complaint is anonymous
  const isAnonymous = complaint.complainantName === 'Anonymous' || complaint.userName === 'Anonymous';
  
  // Get safe property values with anonymity protection
  const complainantName = isAnonymous ? 'Anonymous' : getSafeProperty(complaint, 'userName', 'complainantName', 'Complainant');
  const complainantEmail: string = getSafeProperty(complaint, 'userEmail', 'complainantEmail', '');
  const complainantId = getSafeProperty(complaint, 'userId', 'complainantId', 'unknown');
  const incidentLocation: string = getSafeProperty(complaint, 'location', 'incidentLocation', '');
  const createdAt: string = getSafeProperty(complaint, 'reportedAt', 'createdAt', '');
  
  // Check for invalid dates
  const isInvalidReportedDate = createdAt && (new Date(createdAt).toString() === 'Invalid Date' || isNaN(new Date(createdAt).getTime()));
  const isInvalidIncidentDate = complaint.incidentDate && (new Date(complaint.incidentDate).toString() === 'Invalid Date' || isNaN(new Date(complaint.incidentDate).getTime()));
  
  // Severity guide data
  const severityGuide: Record<string, { description: string; timeframe: string }> = {
    low: { description: 'Minor issue', timeframe: 'within 10-15 business days' },
    medium: { description: 'Requires timely investigation', timeframe: 'within 5-7 business days' },
    high: { description: 'Serious matter', timeframe: 'within 2-3 business days' },
    critical: { description: 'Urgent action required', timeframe: 'within 24 hours' },
  };

  // Scroll only the messages pane — scrollIntoView() on the anchor can scroll the
  // window/document and leave a gap under h-screen layouts.
  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || isUserScrolling) return;
    el.scrollTop = el.scrollHeight;
  }, [isUserScrolling]);

  // Update ref whenever scrollToBottom changes
  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom]);

  // Check if user is at the bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
    
    setIsUserScrolling(!isAtBottom);
  };

  // Initialize chat room and subscribe to messages
  useEffect(() => {
    if (!currentUser || !complaintId) return;

    let unsubscribeMessages: (() => void) | undefined;
    let unsubscribeChatRoom: (() => void) | undefined;

    const initChat = async () => {
      try {
        setLoading(true);
        console.log('🚀 Initializing chat for complaint:', complaintId);

        // Get or create chat room
        let room: ChatRoom;
        const existingRoom = await MessageService.getChatRoomByComplaint(complaintId);
        
        if (existingRoom) {
          console.log('📋 Found existing chat room:', existingRoom.id);
          room = existingRoom;
          
          // Ensure handler is added to the chat room
          if (room.handlerId !== currentUser.uid) {
            console.log('👤 Adding handler to existing chat room');
            await MessageService.addHandler(
              room.id,
              currentUser.uid,
              currentUser.displayName || currentUser.email || 'Handler'
            );
          }
        } else {
          console.log('🆕 Creating new chat room');
          // Create new chat room with handler info
          room = await MessageService.getOrCreateChatRoom(
            complaintId,
            complaint.title || 'Case Discussion',
            complainantId,
            complainantName,
            currentUser.uid,
            currentUser.displayName || currentUser.email || 'Handler'
          );
        }

        console.log('✅ Chat room ready:', room.id);
        setChatRoom(room);

        // Subscribe to real-time messages
        unsubscribeMessages = MessageService.subscribeToMessages(
          room.id,
          (newMessages) => {
            console.log('🔄 Received', newMessages.length, 'messages');
            setMessages(newMessages);
            
            // Mark messages as read
            if (currentUser) {
              newMessages.forEach((msg) => {
                if (msg.senderId !== currentUser.uid && !msg.readBy?.includes(currentUser.uid)) {
                  MessageService.markMessageAsRead(msg.id, currentUser.uid).catch(console.error);
                }
              });
            }
            
            // Scroll to bottom after a short delay to ensure DOM is updated
            setTimeout(() => scrollToBottomRef.current(), 100);
          }
        );

        // Subscribe to chat room updates (for typing indicators)
        unsubscribeChatRoom = MessageService.subscribeToChatRoom(
          room.id,
          (updatedRoom) => {
            console.log('🔄 Chat room updated');
            setChatRoom(updatedRoom);
            
            // Update typing indicators
            const typingWithNames = (updatedRoom.typingUsers || [])
              .filter(userId => userId !== currentUser.uid) // Don't show self as typing
              .map(userId => ({
                id: userId,
                name: updatedRoom.participants?.[userId]?.name || 'User'
              }));
              
            setTypingUsers(typingWithNames);
          }
        );

        setLoading(false);
      } catch (error) {
        console.error('❌ Error initializing chat:', error);
        toast({
          title: 'Chat Initialization Failed',
          description: error instanceof Error ? error.message : 'Unable to load chat',
          variant: 'destructive'
        });
        setLoading(false);
      }
    };

    initChat();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up chat listeners');
      unsubscribeMessages?.();
      unsubscribeChatRoom?.();
      
      // Stop typing indicator when leaving
      if (currentUser && chatRoom) {
        MessageService.setTyping(
          chatRoom.id,
          currentUser.uid,
          currentUser.displayName || currentUser.email || 'Handler',
          false
        ).catch(console.error);
      }
    };
  }, [complaintId, currentUser, complaint, toast, complainantId, complainantName]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (
    content: string,
    attachments?: MessageAttachment[]
  ) => {
    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive'
      });
      return;
    }
    
    if (!chatRoom) {
      toast({
        title: 'Error',
        description: 'Chat room not initialized',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('📤 Sending message:', content);
      
      await MessageService.sendMessage(
        chatRoom.id,
        complaintId,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Handler',
        'handler',
        content,
        attachments
      );

      console.log('✅ Message sent successfully');

      // Stop typing indicator
      await MessageService.setTyping(
        chatRoom.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Handler',
        false
      );

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    if (!currentUser || !chatRoom) return;

    try {
      await MessageService.setTyping(
        chatRoom.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Handler',
        isTyping
      );
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const groupMessagesByDate = () => {
    const groups: { date: Date; messages: Message[] }[] = [];
    
    messages.forEach((message) => {
      let messageDate: Date;
      
      try {
        if (message.createdAt instanceof Date) {
          messageDate = message.createdAt;
        } else if (typeof message.createdAt === 'string') {
          messageDate = new Date(message.createdAt);
        } else if (message.createdAt?.toDate) {
          messageDate = message.createdAt.toDate();
        } else {
          messageDate = new Date();
        }
      } catch {
        messageDate = new Date();
      }
      
      const existingGroup = groups.find(g => isSameDay(g.date, messageDate));
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({
          date: messageDate,
          messages: [message],
        });
      }
    });
    
    return groups;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'inprogress': 
      case 'in_progress': 
      case 'in progress': 
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200';
      case 'dismissed': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) || 'Unknown';
  };

  if (loading) {
    return (
      <Card className={`${className} shadow-sm border`}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading chat...</span>
        </CardContent>
      </Card>
    );
  }

  if (!chatRoom) {
    return (
      <Card className={`${className} shadow-sm border`}>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Failed to Load Chat</h3>
          <p className="text-xs text-gray-600 text-center">Unable to initialize chat room</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 w-full flex-col gap-2 overflow-hidden sm:gap-3 lg:grid lg:h-full lg:grid-cols-4 lg:items-stretch lg:gap-4 lg:overflow-hidden ${className}`}
    >
      {/* Case Details Sidebar - Hidden on mobile, visible on lg */}
      <div className="hidden min-h-0 flex-col gap-3 overflow-y-auto overscroll-y-contain lg:col-span-1 lg:flex lg:h-full lg:max-h-full">
        {/* Case Info Card */}
        <Card className="shadow-sm border shrink-0">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <span className="hidden sm:inline">Case Information</span>
                <span className="sm:hidden">Case</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCaseDetails(!showCaseDetails)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                {showCaseDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </CardHeader>
          {showCaseDetails && (
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
              {/* Status Badge */}
              <div>
                <Badge className={`${getStatusColor(complaint.status || '')} text-xs px-2 py-0.5`}>
                  {formatStatus(complaint.status || '')}
                </Badge>
              </div>

              {/* Category */}
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Category</p>
                  <p className="text-sm font-medium">{complaint.category || 'Uncategorized'}</p>
                </div>
              </div>

              {/* Incident Date */}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Incident date</p>
                  <p className="text-sm font-medium">
                    {isInvalidIncidentDate 
                      ? 'Invalid Date' 
                      : complaint.incidentDate 
                        ? new Date(complaint.incidentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="italic text-gray-500">Not specified</span>
                    }
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Location</p>
                  <p className="text-sm font-medium">
                    {incidentLocation || <span className="italic text-gray-500">Not specified</span>}
                  </p>
                </div>
              </div>

              {/* Reported Date */}
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Reported</p>
                  <p className="text-sm font-medium">
                    {isInvalidReportedDate
                      ? 'Invalid Date'
                      : createdAt
                        ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="italic text-gray-500">Not specified</span>
                    }
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-2">
                <FileQuestion className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Description</p>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {complaint.description || 'No description provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Complainant Info Card */}
        <Card className="shadow-sm border shrink-0">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <span className="hidden sm:inline">Complainant</span>
              <span className="sm:hidden">User</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
            {/* Anonymity Warning */}
            {isAnonymous && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-900">Anonymous Complaint</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    This complaint was filed anonymously. Identity is protected — do not attempt to identify the complainant.
                  </p>
                </div>
              </div>
            )}

            {/* Name */}
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Name</p>
                <p className="text-sm font-medium">{complainantName}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-2">
              {complainantEmail && complainantEmail.length > 0 && !complainantEmail.startsWith('anonymous@') ? (
                <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              ) : (
                <MailX className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Email</p>
                <p className="text-sm font-medium">
                  {complainantEmail && complainantEmail.length > 0 && !complainantEmail.startsWith('anonymous@')
                    ? complainantEmail 
                    : <span className="italic text-gray-500">No email provided</span>
                  }
                </p>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:col-span-3">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-0 shadow-sm">
          {onClose && (
            <div className="flex shrink-0 justify-end border-b bg-white/95 px-2 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 relative min-h-0 min-w-0">
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-gray-50 to-white"
            >
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-4 sm:px-5">
            {messageGroups.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <MessageCircle className="h-10 w-10 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1">No messages yet</p>
                <p className="text-xs text-gray-600">
                  Start the conversation
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col space-y-3">
                {messageGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <DateSeparator date={group.date} />
                    {group.messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === currentUser?.uid}
                        showSenderName={false}
                      />
                    ))}
                  </div>
                ))}
                
                {typingUsers.length > 0 && (
                  <TypingIndicator 
                    userNames={typingUsers.map(u => u.name)} 
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
              </div>
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
                className="absolute bottom-[5.75rem] left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#1a7a45] text-white shadow-lg hover:bg-emerald-700 sm:bottom-24"
                size="sm"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                New Messages
              </Button>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t bg-white">
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-5 py-3">
            <ChatInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={!chatRoom}
              placeholder="Type a message..."
            />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default HandlerChatInterface;


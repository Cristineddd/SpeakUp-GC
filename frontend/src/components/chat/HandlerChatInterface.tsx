import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageService } from '../../services/messageService';
import { MessageBubble, TypingIndicator, DateSeparator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  MessageCircle,
  X,
  AlertCircle,
  Loader2,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Edit2,
} from 'lucide-react';
import type { Message, ChatRoom, MessageAttachment } from '../../types/message';
import { isSameDay } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FORMAL_COMPLAINT_CATEGORIES, getFormalComplaintCategoryLabel } from '../../constants/formalComplaintCategories';
import { getDisplayCaseNumber } from '../../utils/caseId';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatSeverityLabel,
  safeToDate,
} from '../../utils/dateFormat';
import {
  CaseDetailField,
  CaseDetailGrid,
  CaseDetailSection,
  CaseDetailStat,
  CaseDetailTextBlock,
} from '../case/CaseDetailLayout';

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
  caseId?: string;
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

export function CODIMemberChatInterface({
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
  const [showMobileCaseDetails, setShowMobileCaseDetails] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(complaint.category || '');
  const [updatingCategory, setUpdatingCategory] = useState(false);
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
  const reportedAtValue = complaint.reportedAt ?? complaint.createdAt;
  const incidentDateValue = complaint.incidentDate;
  const caseNumber = getDisplayCaseNumber({
    caseId: complaint.caseId,
    firestoreId: complaintId,
    filedAt: safeToDate(reportedAtValue),
  });
  const categoryLabel = getFormalComplaintCategoryLabel(complaint.category || '');
  const descriptionText = complaint.description?.trim() || 'No description provided';
  const isLongDescription = descriptionText.length > 140;
  
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
          
          // Ensure CODI member is added to the chat room
          if (room.handlerId !== currentUser.uid) {
            console.log('👤 Adding CODI member to existing chat room');
            await MessageService.addHandler(
              room.id,
              currentUser.uid,
              currentUser.displayName || currentUser.email || 'CODI Member'
            );
          }
        } else {
          console.log('🆕 Creating new chat room');
          // Create new chat room with CODI member info
          room = await MessageService.getOrCreateChatRoom(
            complaintId,
            complaint.title || 'Case Discussion',
            complainantId,
            complainantName,
            currentUser.uid,
            currentUser.displayName || currentUser.email || 'CODI Member'
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
          currentUser.displayName || currentUser.email || 'CODI Member',
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
        currentUser.displayName || currentUser.email || 'CODI Member',
        'codi',
        content,
        attachments
      );

      console.log('✅ Message sent successfully');

      // Stop typing indicator
      await MessageService.setTyping(
        chatRoom.id,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'CODI Member',
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
        currentUser.displayName || currentUser.email || 'CODI Member',
        isTyping
      );
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || selectedCategory === complaint.category) {
      setIsEditingCategory(false);
      return;
    }

    try {
      setUpdatingCategory(true);
      
      const complaintRef = doc(db, 'complaints', complaintId);
      await updateDoc(complaintRef, {
        category: selectedCategory,
        type: selectedCategory,
        updatedAt: new Date()
      });

      toast({
        title: 'Category Updated',
        description: 'Complaint category has been reclassified successfully.',
      });

      setIsEditingCategory(false);
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update category. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUpdatingCategory(false);
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
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'submitted':
        return 'Submitted';
      case 'inprogress':
      case 'in_progress':
        return 'Investigating';
      case 'resolved':
        return 'Resolved';
      case 'dismissed':
        return 'Dismissed';
      case 'closed':
        return 'Closed';
      default:
        return status?.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()) || 'Unknown';
    }
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
      <div className="shrink-0 px-2 pt-1 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMobileCaseDetails((open) => !open)}
          className="h-9 w-full justify-between border-gray-200 bg-white/90 text-gray-700"
        >
          <span className="flex items-center gap-2 text-xs font-medium">
            <FileText className="h-3.5 w-3.5 text-[#1D9E75]" />
            Case details
          </span>
          {showMobileCaseDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Case Details Sidebar */}
      <div
        className={`${showMobileCaseDetails ? 'flex' : 'hidden'} min-h-0 max-h-[42vh] flex-col gap-3 overflow-y-auto overscroll-y-contain px-2 pb-1 lg:col-span-1 lg:flex lg:h-full lg:max-h-full lg:px-0 lg:pb-0`}
      >
        {/* Case Info Card */}
        <div className="shrink-0 rounded-2xl border border-emerald-100/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-50 px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 sm:text-sm">
              <FileText className="h-4 w-4 text-[#1D9E75]" />
              <span className="hidden sm:inline">Case Information</span>
              <span className="sm:hidden">Case</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCaseDetails(!showCaseDetails)}
              className="h-7 w-7 p-0 hover:bg-emerald-50"
            >
              {showCaseDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {showCaseDetails && (
            <div className="space-y-4 px-3 py-3 sm:px-4 sm:pb-4">
              <CaseDetailStat label="Case No.">
                <span className="font-mono">{caseNumber}</span>
              </CaseDetailStat>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${getStatusColor(complaint.status || '')} text-xs px-2 py-0.5`}>
                  {formatStatus(complaint.status || '')}
                </Badge>
                {complaint.severity && (
                  <Badge variant="outline" className={`${getSeverityColor(complaint.severity)} text-xs px-2 py-0.5`}>
                    {formatSeverityLabel(complaint.severity)}
                  </Badge>
                )}
              </div>

              <CaseDetailGrid columns={1}>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Category</p>
                    {!isEditingCategory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-emerald-50"
                        onClick={() => {
                          setIsEditingCategory(true);
                          setSelectedCategory(complaint.category || '');
                        }}
                      >
                        <Edit2 className="h-3 w-3 text-gray-500" />
                      </Button>
                    )}
                  </div>
                  {isEditingCategory ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                        disabled={updatingCategory}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMAL_COMPLAINT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 bg-[#1D9E75] px-2 hover:bg-[#178F65]"
                        onClick={handleUpdateCategory}
                        disabled={updatingCategory || selectedCategory === complaint.category}
                      >
                        {updatingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setIsEditingCategory(false);
                          setSelectedCategory(complaint.category || '');
                        }}
                        disabled={updatingCategory}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{categoryLabel}</p>
                  )}
                </div>

                <CaseDetailField
                  label="Incident Date"
                  value={formatDisplayDate(incidentDateValue)}
                />
                <CaseDetailField
                  label="Location"
                  value={
                    incidentLocation || <span className="italic text-gray-500">Not specified</span>
                  }
                />
                <CaseDetailField
                  label="Reported"
                  value={formatDisplayDateTime(reportedAtValue)}
                />
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Description
                  </p>
                  <CaseDetailTextBlock
                    className={`max-h-32 ${descriptionExpanded ? '' : 'line-clamp-4'}`}
                  >
                    {descriptionText}
                  </CaseDetailTextBlock>
                  {isLongDescription && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                      className="mt-1.5 text-xs font-medium text-[#1D9E75] hover:underline"
                    >
                      {descriptionExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </CaseDetailGrid>
            </div>
          )}
        </div>

        {/* Complainant Info Card */}
        <CaseDetailSection
          title="Complainant"
          icon={User}
          className="shrink-0 p-3 sm:p-4"
        >
          {isAnonymous && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-blue-900">Anonymous Complaint</p>
                <p className="mt-0.5 text-xs text-blue-700">
                  This complaint was filed anonymously. Identity is protected — do not attempt to identify the complainant.
                </p>
              </div>
            </div>
          )}

          <CaseDetailGrid columns={1}>
            <CaseDetailField label="Name" value={complainantName} />
            <CaseDetailField
              label="Email"
              value={
                complainantEmail && complainantEmail.length > 0 && !complainantEmail.startsWith('anonymous@')
                  ? complainantEmail
                  : <span className="italic text-gray-500">No email provided</span>
              }
            />
          </CaseDetailGrid>
        </CaseDetailSection>
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
                        showSenderName={message.senderId !== currentUser?.uid}
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
                className="absolute bottom-[5.75rem] left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#1D9E75] text-white shadow-lg hover:bg-emerald-700 sm:bottom-24"
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

export default CODIMemberChatInterface;


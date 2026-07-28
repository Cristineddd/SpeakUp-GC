import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageService } from '../../services/messageService';
import { MessageBubble, TypingIndicator, DateSeparator } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  MessageCircle,
  X,
  AlertCircle,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
  Info,
  Edit2,
  PanelRight,
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
  safeToDate,
} from '../../utils/dateFormat';
import { CaseDetailTextBlock } from '../case/CaseDetailLayout';

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
        const existingRoom = await MessageService.getChatRoomByComplaint(
          complaintId,
          currentUser.uid,
          { asStaff: true }
        );
        
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
            currentUser.displayName || currentUser.email || 'CODI Member',
            { requestingUserId: currentUser.uid, asStaff: true }
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

  const complainantInitial = (complainantName || 'C').charAt(0).toUpperCase();

  const renderDetailsPanel = (closePanel?: () => void) => (
    <>
      <div className="relative border-b bg-white px-4 pb-4 pt-5 text-center">
        {closePanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={closePanel}
            className="absolute right-2 top-2 h-8 w-8 lg:hidden"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-[#0d7a5c] to-[#1D9E75] text-2xl font-bold text-white shadow-lg ring-4 ring-white">
          {isAnonymous ? <User className="h-8 w-8" /> : complainantInitial}
        </div>
        <h2 className="mt-3 text-base font-semibold text-gray-900">{complainantName}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{complaint.title || categoryLabel}</p>
        <p className="mt-1 font-mono text-[11px] text-emerald-700">{caseNumber}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b px-4 py-3">
          <button
            type="button"
            onClick={() => setShowCaseDetails(!showCaseDetails)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-gray-900">Case information</span>
            {showCaseDetails ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showCaseDetails && (
            <div className="mt-3 space-y-3">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <div className="col-span-2">
                  <div className="mb-0.5 flex items-center justify-between">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Category</dt>
                    {!isEditingCategory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-gray-100"
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
                    <div className="flex flex-col gap-1.5">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={updatingCategory}>
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
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 flex-1 bg-[#1D9E75] text-xs hover:bg-[#178F65]"
                          onClick={handleUpdateCategory}
                          disabled={updatingCategory || selectedCategory === complaint.category}
                        >
                          {updatingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 flex-1 text-xs"
                          onClick={() => {
                            setIsEditingCategory(false);
                            setSelectedCategory(complaint.category || '');
                          }}
                          disabled={updatingCategory}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dd className="text-xs font-medium text-gray-900">{categoryLabel}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Incident</dt>
                  <dd className="mt-0.5 text-xs font-medium text-gray-900">{formatDisplayDate(incidentDateValue)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Reported</dt>
                  <dd className="mt-0.5 text-xs font-medium text-gray-900">{formatDisplayDateTime(reportedAtValue)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Location</dt>
                  <dd className="mt-0.5 text-xs font-medium text-gray-900">
                    {incidentLocation || <span className="italic text-gray-500">Not specified</span>}
                  </dd>
                </div>
              </dl>
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Description</p>
                <CaseDetailTextBlock className={`max-h-28 text-xs ${descriptionExpanded ? '' : 'line-clamp-4'}`}>
                  {descriptionText}
                </CaseDetailTextBlock>
                {isLongDescription && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                    className="mt-1 text-[11px] font-medium text-[#1D9E75] hover:underline"
                  >
                    {descriptionExpanded ? 'See less' : 'See more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Complainant</p>
          {isAnonymous && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
              <p className="text-[11px] leading-snug text-blue-800">Anonymous — identity protected.</p>
            </div>
          )}
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Name</dt>
              <dd className="mt-0.5 text-xs font-medium text-gray-900">{complainantName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Email</dt>
              <dd className="mt-0.5 text-xs font-medium text-gray-900">
                {complainantEmail && complainantEmail.length > 0 && !complainantEmail.startsWith('anonymous@')
                  ? complainantEmail
                  : <span className="italic text-gray-500">No email provided</span>}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );

  const messageGroups = groupMessagesByDate();

  return (
    <div className={`flex h-full min-h-0 w-full flex-col ${className}`}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-col px-2 pb-2 pt-1 sm:px-3">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
          {/* Main chat — Messenger center column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-gradient-to-r from-white to-emerald-50/30 px-3 py-2.5 sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0d7a5c] to-[#1D9E75] text-sm font-bold text-white shadow-md ring-2 ring-white">
                {isAnonymous ? <User className="h-5 w-5" /> : complainantInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-gray-900">{complainantName}</p>
                <p className="truncate text-xs text-gray-500">
                  {complaint.title || categoryLabel}
                  <span className="mx-1 text-gray-300">·</span>
                  <span className="font-mono text-[11px]">{caseNumber}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileCaseDetails(true)}
                className="h-9 w-9 shrink-0 rounded-full text-gray-600 hover:bg-gray-100 lg:hidden"
                aria-label="Case details"
              >
                <PanelRight className="h-5 w-5" />
              </Button>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 shrink-0 rounded-full" aria-label="Close chat">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

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
                      Say hi to start this case conversation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 px-3 py-3 sm:px-4">
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
                      <TypingIndicator userNames={typingUsers.map((u) => u.name)} />
                    )}
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

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm">
              <ChatInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                disabled={!chatRoom}
                placeholder="Aa"
                embedded
                messengerStyle
              />
            </div>
          </div>

          {/* Right details panel — Messenger-style (desktop) */}
          <aside className="hidden w-[300px] shrink-0 flex-col overflow-hidden border-l border-slate-200/80 bg-slate-50/40 lg:flex xl:w-[320px]">
            {renderDetailsPanel()}
          </aside>
        </div>
      </div>

      {/* Mobile details drawer */}
      {showMobileCaseDetails && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close details overlay"
            onClick={() => setShowMobileCaseDetails(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,320px)] flex-col overflow-hidden border-l bg-white shadow-2xl lg:hidden">
            {renderDetailsPanel(() => setShowMobileCaseDetails(false))}
          </aside>
        </>
      )}
    </div>
  );
}

export default CODIMemberChatInterface;


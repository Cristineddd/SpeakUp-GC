/**
 * Message Types & Interfaces
 * Real-time chat system for complainant ↔ handler communication
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Message Type
 */
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'audio' | 'voice';

/**
 * Message Status
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Message Attachment
 */
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // MIME type
  size: number; // bytes
  uploadedAt: string | Timestamp;
}

/**
 * Message Interface
 */
export interface Message {
  id: string;
  chatRoomId: string;
  complaintId: string;
  
  // Sender info
  senderId: string;
  senderName: string;
  senderRole: 'complainant' | 'handler' | 'admin' | 'codi' | 'system';
  
  // Message content
  type: MessageType;
  content: string;
  attachments?: MessageAttachment[];
  
  // Audio/Voice content
  audioUrl?: string; // URL to audio file
  voiceTranscript?: string; // Transcription of voice message
  audioDuration?: number; // Duration in seconds
  
  // Metadata
  status: MessageStatus;
  createdAt: string | Timestamp;
  updatedAt?: string | Timestamp;
  
  // Read receipts
  readBy: string[]; // Array of user IDs who read this message
  readAt?: { [userId: string]: string | Timestamp };
  
  // Reactions (optional for future)
  reactions?: {
    [emoji: string]: string[]; // emoji -> array of user IDs
  };
  
  // Reply to another message (optional)
  replyTo?: string; // Message ID
  
  // Editing
  isEdited?: boolean;
  editedAt?: string | Timestamp;
  
  // Deletion
  isDeleted?: boolean;
  deletedAt?: string | Timestamp;
  deletedBy?: string;
}

/**
 * Chat Room Interface
 * Represents a conversation between complainant and handler(s)
 */
export interface ChatRoom {
  id: string;
  complaintId: string;
  complaintTitle: string;
  
  // Participants
  complainantId: string;
  complainantName: string;
  handlerId?: string | null;
  handlerName?: string | null;
  
  // Additional participants (for group chat - optional)
  participantIds: string[];
  participants: {
    [userId: string]: {
      name: string;
      role: 'complainant' | 'handler' | 'admin' | 'codi';
      joinedAt: string | Timestamp;
      lastSeenAt?: string | Timestamp;
    };
  };
  
  // Chat state
  status: 'active' | 'closed' | 'archived';
  isActive: boolean;
  
  // Last message info
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string | Timestamp;
  };
  
  // Unread counts per user
  unreadCount: {
    [userId: string]: number;
  };
  
  // Typing indicators
  typingUsers: string[]; // Array of user IDs currently typing
  
  // Metadata
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
  closedAt?: string | Timestamp;
  closedBy?: string;
  
  // Settings
  settings?: {
    allowAttachments: boolean;
    maxAttachmentSize: number; // MB
    allowedFileTypes: string[];
  };
}

/**
 * Typing Indicator
 */
export interface TypingIndicator {
  userId: string;
  userName: string;
  chatRoomId: string;
  startedAt: Timestamp;
}

/**
 * Chat Statistics
 */
export interface ChatStats {
  totalMessages: number;
  totalChatRooms: number;
  activeChatRooms: number;
  averageResponseTime: number; // minutes
  messagesLast24Hours: number;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    messageCount: number;
  }>;
}

/**
 * Default chat room settings
 */
export const DEFAULT_CHAT_SETTINGS: {
  allowAttachments: boolean;
  maxAttachmentSize: number;
  allowedFileTypes: string[];
} = {
  allowAttachments: true,
  maxAttachmentSize: 10, // 10 MB
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
};

/**
 * Message content validation
 */
export const MESSAGE_CONSTRAINTS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 5000,
  MAX_ATTACHMENTS: 5,
  MAX_FILE_SIZE_MB: 10,
} as const;

/**
 * Typing timeout (milliseconds)
 * How long to wait before removing typing indicator
 */
export const TYPING_TIMEOUT_MS = 3000;

/**
 * Message status labels
 */
export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  sending: 'Sending...',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

/**
 * System message templates
 */
export const SYSTEM_MESSAGES = {
  CASE_ASSIGNED: (handlerName: string) => 
    `${handlerName} has taken your case.`,
  
  CASE_REASSIGNED: (oldHandler: string, newHandler: string) => 
    `Case handler changed from ${oldHandler} to ${newHandler}.`,
  
  CASE_ESCALATED: (level: string) => 
    `Case has been escalated to ${level} priority.`,
  
  STATUS_CHANGED: (oldStatus: string, newStatus: string) => 
    `Case status updated: ${oldStatus} → ${newStatus}`,
  
  CHAT_OPENED: (userName: string) => 
    `${userName} opened this chat.`,
  
  CHAT_CLOSED: (userName: string) => 
    `${userName} closed this chat.`,
  
  FILE_UPLOADED: (fileName: string) => 
    `Uploaded file: ${fileName}`,
  
  WELCOME: () => 
    `Welcome to the case chat. A handler will respond to you shortly. You can send messages and attach files here.`,
} as const;

/**
 * Helper: Check if user is participant
 */
export function isParticipant(chatRoom: ChatRoom, userId: string): boolean {
  return chatRoom.participantIds.includes(userId);
}

/**
 * Helper: Get unread count for user
 */
export function getUnreadCount(chatRoom: ChatRoom, userId: string): number {
  return chatRoom.unreadCount[userId] || 0;
}

/**
 * Helper: Check if message is from current user
 */
export function isOwnMessage(message: Message, currentUserId: string): boolean {
  return message.senderId === currentUserId;
}

/**
 * Helper: Check if message is read by user
 */
export function isReadByUser(message: Message, userId: string): boolean {
  return message.readBy.includes(userId);
}

/**
 * Helper: Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper: Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  return '📎';
}

/**
 * Helper: Validate file type
 */
export function isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      // Wildcard match (e.g., "image/*")
      const prefix = type.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === type;
  });
}

/**
 * Helper: Create system message
 */
export function createSystemMessage(
  chatRoomId: string,
  complaintId: string,
  content: string
): Partial<Message> {
  return {
    chatRoomId,
    complaintId,
    senderId: 'SYSTEM',
    senderName: 'System',
    senderRole: 'system',
    type: 'system',
    content,
    status: 'sent',
    readBy: [],
    createdAt: new Date().toISOString(),
  };
}

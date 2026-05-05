import { Timestamp } from 'firebase/firestore';

/* ──────────────── Group ──────────────── */

export type GroupCategory =
  | 'general'
  | 'concern'
  | 'department'
  | 'mental-health'
  | 'academic'
  | 'safety'
  | 'bullying'
  | 'relationships'
  | 'other';

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  category: GroupCategory;
  avatarUrl?: string;

  // Ownership
  createdBy: string; // userId
  createdByName: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;

  // Members
  memberIds: string[];
  memberCount: number;
  members: {
    [userId: string]: GroupMember;
  };

  // Moderation
  adminIds: string[]; // admins / moderators
  pinnedMessageIds: string[];

  // Status
  isActive: boolean;
  isArchived: boolean;

  // Last message preview
  lastMessage?: string;
  lastMessageAt?: Timestamp | string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;

  // Unread per user
  unreadCount: { [userId: string]: number };
}

export interface GroupMember {
  userId: string;
  displayName: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Timestamp | string;
  isOnline?: boolean;
  lastSeen?: Timestamp | string;
}

/* ──────────────── Group Message ──────────────── */

export type GroupMessageType = 'text' | 'image' | 'file' | 'system' | 'audio';

export type GroupMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface GroupMessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // MIME
  size: number;
  uploadedAt: Timestamp | string;
}

export interface GroupMessage {
  id: string;
  groupId: string;

  // Sender
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'moderator' | 'member' | 'system';

  // Anonymous
  isAnonymous: boolean;

  // Content
  type: GroupMessageType;
  content: string;
  attachments?: GroupMessageAttachment[];

  // Audio
  audioUrl?: string;
  voiceTranscript?: string;
  audioDuration?: number;

  // Meta
  status: GroupMessageStatus;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;

  // Read receipts
  readBy: string[];

  // Reactions
  reactions?: {
    [emoji: string]: string[]; // emoji → userIds
  };

  // Reply / thread
  replyTo?: string; // messageId
  replyToContent?: string;
  replyToSenderName?: string;

  // Pinned
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Timestamp | string;

  // Edit / Delete
  isEdited?: boolean;
  editedAt?: Timestamp | string;
  isDeleted?: boolean;
  deletedAt?: Timestamp | string;
  deletedBy?: string;
}

/* ──────────────── Typing Indicator ──────────────── */

export interface TypingIndicator {
  userId: string;
  displayName: string;
  groupId: string;
  timestamp: Timestamp | string;
}

/* ──────────────── User Presence ──────────────── */

export interface UserPresence {
  userId: string;
  displayName: string;
  isOnline: boolean;
  lastSeen: Timestamp | string;
}

/* ──────────────── Category Helpers ──────────────── */

export const GROUP_CATEGORY_LABELS: Record<GroupCategory, string> = {
  general: '💬 General',
  concern: '⚠️ Concern',
  department: '🏢 Department',
  'mental-health': '🧠 Mental Health',
  academic: '📚 Academic',
  safety: '🛡️ Safety',
  bullying: '🚨 Bullying',
  relationships: '❤️ Relationships',
  other: '📌 Other',
};

export const GROUP_CATEGORY_COLORS: Record<GroupCategory, string> = {
  general: 'bg-gray-100 text-gray-700',
  concern: 'bg-amber-100 text-amber-700',
  department: 'bg-indigo-100 text-indigo-700',
  'mental-health': 'bg-purple-100 text-purple-700',
  academic: 'bg-blue-100 text-blue-700',
  safety: 'bg-orange-100 text-orange-700',
  bullying: 'bg-red-100 text-red-700',
  relationships: 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-700',
};

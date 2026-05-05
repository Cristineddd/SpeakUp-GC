/**
 * Group Chat Service
 * Real-time group messaging powered by Firebase Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  addDoc,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  GroupChat,
  GroupMessage,
  GroupCategory,
  GroupMember,
  TypingIndicator,
} from '../types/groupChat';

export class GroupChatService {
  private static readonly GROUPS = 'groups';
  private static readonly GROUP_MESSAGES = 'groupMessages';
  private static readonly TYPING = 'groupTyping';
  private static readonly PRESENCE = 'presence';

  /* ───────────────── Group CRUD ───────────────── */

  /** Create a new group chat */
  static async createGroup(data: {
    name: string;
    description?: string;
    category: GroupCategory;
    createdBy: string;
    createdByName: string;
  }): Promise<GroupChat> {
    const now = Timestamp.now();
    const groupRef = doc(collection(db, this.GROUPS));

    const group: Omit<GroupChat, 'id'> = {
      name: data.name,
      description: data.description || '',
      category: data.category,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
      memberIds: [data.createdBy],
      memberCount: 1,
      members: {
        [data.createdBy]: {
          userId: data.createdBy,
          displayName: data.createdByName,
          role: 'admin',
          joinedAt: now,
          isOnline: true,
        },
      },
      adminIds: [data.createdBy],
      pinnedMessageIds: [],
      isActive: true,
      isArchived: false,
      unreadCount: {},
    };

    await setDoc(groupRef, group);

    // Send system message
    await this.sendMessage({
      groupId: groupRef.id,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      content: `${data.createdByName} created the group "${data.name}"`,
      type: 'system',
      isAnonymous: false,
    });

    return { id: groupRef.id, ...group };
  }

  /** Get a single group */
  static async getGroup(groupId: string): Promise<GroupChat | null> {
    const snap = await getDoc(doc(db, this.GROUPS, groupId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as GroupChat;
  }

  /** Get all groups a user belongs to */
  static async getUserGroups(userId: string): Promise<GroupChat[]> {
    const q = query(
      collection(db, this.GROUPS),
      where('memberIds', 'array-contains', userId),
      where('isActive', '==', true),
      orderBy('lastMessageAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupChat));
  }

  /** Get all groups (admin) */
  static async getAllGroups(): Promise<GroupChat[]> {
    const q = query(
      collection(db, this.GROUPS),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupChat));
  }

  /** Subscribe to user's groups in real-time */
  static subscribeToUserGroups(
    userId: string,
    callback: (groups: GroupChat[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.GROUPS),
      where('memberIds', 'array-contains', userId),
      where('isActive', '==', true)
    );
    return onSnapshot(q, (snap) => {
      const groups = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as GroupChat))
        .sort((a, b) => {
          const aTime = a.lastMessageAt
            ? (a.lastMessageAt instanceof Timestamp ? a.lastMessageAt.toMillis() : new Date(a.lastMessageAt).getTime())
            : 0;
          const bTime = b.lastMessageAt
            ? (b.lastMessageAt instanceof Timestamp ? b.lastMessageAt.toMillis() : new Date(b.lastMessageAt).getTime())
            : 0;
          return bTime - aTime;
        });
      callback(groups);
    });
  }

  /** Update group info */
  static async updateGroup(
    groupId: string,
    data: Partial<Pick<GroupChat, 'name' | 'description' | 'category' | 'isArchived'>>
  ): Promise<void> {
    await updateDoc(doc(db, this.GROUPS, groupId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /** Delete (soft) a group */
  static async deleteGroup(groupId: string): Promise<void> {
    await updateDoc(doc(db, this.GROUPS, groupId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  }

  /* ───────────────── Members ───────────────── */

  /** Join group */
  static async joinGroup(
    groupId: string,
    userId: string,
    displayName: string
  ): Promise<void> {
    const now = Timestamp.now();
    const member: GroupMember = {
      userId,
      displayName,
      role: 'member',
      joinedAt: now,
      isOnline: true,
    };

    await updateDoc(doc(db, this.GROUPS, groupId), {
      memberIds: arrayUnion(userId),
      memberCount: increment(1),
      [`members.${userId}`]: member,
      updatedAt: serverTimestamp(),
    });

    await this.sendMessage({
      groupId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      content: `${displayName} joined the group`,
      type: 'system',
      isAnonymous: false,
    });
  }

  /** Leave group */
  static async leaveGroup(
    groupId: string,
    userId: string,
    displayName: string
  ): Promise<void> {
    await updateDoc(doc(db, this.GROUPS, groupId), {
      memberIds: arrayRemove(userId),
      memberCount: increment(-1),
      [`members.${userId}`]: deleteField(),
      updatedAt: serverTimestamp(),
    });

    await this.sendMessage({
      groupId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      content: `${displayName} left the group`,
      type: 'system',
      isAnonymous: false,
    });
  }

  /** Promote member to moderator */
  static async promoteMember(groupId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, this.GROUPS, groupId), {
      [`members.${userId}.role`]: 'moderator',
      adminIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  }

  /** Demote moderator to member */
  static async demoteMember(groupId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, this.GROUPS, groupId), {
      [`members.${userId}.role`]: 'member',
      adminIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });
  }

  /* ───────────────── Messages ───────────────── */

  /** Send a message */
  static async sendMessage(data: {
    groupId: string;
    senderId: string;
    senderName: string;
    senderRole: 'admin' | 'moderator' | 'member' | 'system';
    content: string;
    type?: GroupMessage['type'];
    isAnonymous: boolean;
    attachments?: GroupMessage['attachments'];
    replyTo?: string;
    replyToContent?: string;
    replyToSenderName?: string;
  }): Promise<GroupMessage> {
    const now = Timestamp.now();
    const msgRef = doc(collection(db, this.GROUP_MESSAGES));

    const message: Omit<GroupMessage, 'id'> = {
      groupId: data.groupId,
      senderId: data.senderId,
      senderName: data.isAnonymous ? 'Anonymous' : data.senderName,
      senderRole: data.senderRole,
      isAnonymous: data.isAnonymous,
      type: data.type || 'text',
      content: data.content,
      attachments: data.attachments,
      status: 'sent',
      createdAt: now,
      readBy: [data.senderId],
      replyTo: data.replyTo,
      replyToContent: data.replyToContent,
      replyToSenderName: data.replyToSenderName,
    };

    await setDoc(msgRef, message);

    // Update group last message & unread counts
    const group = await this.getGroup(data.groupId);
    if (group) {
      const unreadUpdates: Record<string, number> = {};
      group.memberIds.forEach((memberId) => {
        if (memberId !== data.senderId) {
          unreadUpdates[`unreadCount.${memberId}`] = increment(1) as any;
        }
      });

      await updateDoc(doc(db, this.GROUPS, data.groupId), {
        lastMessage: data.isAnonymous
          ? `Anonymous: ${data.content.substring(0, 60)}`
          : `${data.senderName}: ${data.content.substring(0, 60)}`,
        lastMessageAt: now,
        lastMessageSenderId: data.senderId,
        lastMessageSenderName: data.isAnonymous ? 'Anonymous' : data.senderName,
        ...unreadUpdates,
      });
    }

    return { id: msgRef.id, ...message };
  }

  /** Subscribe to messages in a group */
  static subscribeToMessages(
    groupId: string,
    callback: (messages: GroupMessage[]) => void,
    messageLimit: number = 100
  ): Unsubscribe {
    const q = query(
      collection(db, this.GROUP_MESSAGES),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'asc'),
      limit(messageLimit)
    );

    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as GroupMessage)
      );
      callback(messages);
    });
  }

  /** Mark messages as read */
  static async markAsRead(groupId: string, userId: string): Promise<void> {
    // Reset unread count
    await updateDoc(doc(db, this.GROUPS, groupId), {
      [`unreadCount.${userId}`]: 0,
    });
  }

  /** Delete a message (admin/moderator) */
  static async deleteMessage(
    messageId: string,
    deletedBy: string
  ): Promise<void> {
    await updateDoc(doc(db, this.GROUP_MESSAGES, messageId), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy,
      content: 'This message has been deleted',
    });
  }

  /** Pin / unpin a message */
  static async togglePinMessage(
    groupId: string,
    messageId: string,
    pin: boolean,
    pinnedBy: string
  ): Promise<void> {
    await updateDoc(doc(db, this.GROUP_MESSAGES, messageId), {
      isPinned: pin,
      pinnedBy: pin ? pinnedBy : null,
      pinnedAt: pin ? serverTimestamp() : null,
    });

    await updateDoc(doc(db, this.GROUPS, groupId), {
      pinnedMessageIds: pin
        ? arrayUnion(messageId)
        : arrayRemove(messageId),
    });
  }

  /** Add reaction to message */
  static async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    const msgRef = doc(db, this.GROUP_MESSAGES, messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const msg = msgSnap.data() as GroupMessage;
    const reactions = msg.reactions || {};
    const users = reactions[emoji] || [];

    if (users.includes(userId)) {
      // Remove reaction
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayRemove(userId),
      });
    } else {
      // Add reaction
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayUnion(userId),
      });
    }
  }

  /* ───────────────── Typing Indicators ───────────────── */

  /** Set typing status */
  static async setTyping(
    groupId: string,
    userId: string,
    displayName: string,
    isTyping: boolean
  ): Promise<void> {
    const typingRef = doc(db, this.TYPING, `${groupId}_${userId}`);
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        displayName,
        groupId,
        timestamp: serverTimestamp(),
      });
    } else {
      await deleteDoc(typingRef).catch(() => {});
    }
  }

  /** Subscribe to typing indicators */
  static subscribeToTyping(
    groupId: string,
    currentUserId: string,
    callback: (typingUsers: TypingIndicator[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.TYPING),
      where('groupId', '==', groupId)
    );

    return onSnapshot(q, (snap) => {
      const typing = snap.docs
        .map((d) => d.data() as TypingIndicator)
        .filter((t) => t.userId !== currentUserId);
      callback(typing);
    });
  }

  /* ───────────────── Presence ───────────────── */

  /** Update user online status */
  static async setPresence(
    userId: string,
    displayName: string,
    isOnline: boolean
  ): Promise<void> {
    await setDoc(
      doc(db, this.PRESENCE, userId),
      {
        userId,
        displayName,
        isOnline,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /** Subscribe to presence for group members */
  static subscribeToPresence(
    memberIds: string[],
    callback: (presenceMap: Record<string, boolean>) => void
  ): Unsubscribe {
    if (memberIds.length === 0) {
      callback({});
      return () => {};
    }

    // Firestore "in" queries support max 30 items
    const slice = memberIds.slice(0, 30);
    const q = query(
      collection(db, this.PRESENCE),
      where('userId', 'in', slice)
    );

    return onSnapshot(q, (snap) => {
      const map: Record<string, boolean> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        map[data.userId] = data.isOnline ?? false;
      });
      callback(map);
    });
  }
}

/**
 * Message Service
 * Handles real-time messaging between complainant and handler
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
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
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Message,
  ChatRoom,
  MessageAttachment,
  MessageType,
  MessageStatus,
  ChatStats,
} from '../types/message';
import { createSystemMessage, DEFAULT_CHAT_SETTINGS, TYPING_TIMEOUT_MS } from '../types/message';
import { NotificationService } from './notificationService';

export class MessageService {
  private static readonly MESSAGES_COLLECTION = 'messages';
  private static readonly CHAT_ROOMS_COLLECTION = 'chatRooms';
  private static readonly TYPING_COLLECTION = 'typingIndicators';
  private static readonly MAX_BATCH_SIZE = 500;

  /**
   * Delete all chat rooms and messages tied to a user (complainant or participant).
   * Call this whenever a user account is permanently removed.
   */
  static async deleteAllDataForUser(userId: string): Promise<{
    chatRoomsDeleted: number;
    messagesDeleted: number;
  }> {
    const chatRoomIds = new Set<string>();
    const complaintIds = new Set<string>();

    const complaintQueries = [
      query(collection(db, 'complaints'), where('userId', '==', userId)),
      query(collection(db, 'complaints'), where('complainantId', '==', userId)),
    ];

    for (const q of complaintQueries) {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => complaintIds.add(d.id));
    }

    const roomQueries = [
      query(collection(db, this.CHAT_ROOMS_COLLECTION), where('participantIds', 'array-contains', userId)),
      query(collection(db, this.CHAT_ROOMS_COLLECTION), where('complainantId', '==', userId)),
    ];

    for (const q of roomQueries) {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => chatRoomIds.add(d.id));
    }

    for (const complaintId of complaintIds) {
      const snap = await getDocs(
        this.buildComplaintRoomQuery(complaintId, userId, false)
      );
      snap.docs.forEach((d) => chatRoomIds.add(d.id));
    }

    let messagesDeleted = 0;

    const senderSnap = await getDocs(
      query(collection(db, this.MESSAGES_COLLECTION), where('senderId', '==', userId))
    );
    messagesDeleted += await this.batchDeleteDocs(senderSnap.docs.map((d) => d.ref));

    for (const complaintId of complaintIds) {
      const snap = await getDocs(
        query(collection(db, this.MESSAGES_COLLECTION), where('complaintId', '==', complaintId))
      );
      messagesDeleted += await this.batchDeleteDocs(snap.docs.map((d) => d.ref));
    }

    for (const chatRoomId of chatRoomIds) {
      const snap = await getDocs(
        query(collection(db, this.MESSAGES_COLLECTION), where('chatRoomId', '==', chatRoomId))
      );
      messagesDeleted += await this.batchDeleteDocs(snap.docs.map((d) => d.ref));
    }

    const chatRoomsDeleted = await this.batchDeleteDocs(
      Array.from(chatRoomIds).map((id) => doc(db, this.CHAT_ROOMS_COLLECTION, id))
    );

    console.log(
      `✅ MessageService: deleted ${chatRoomsDeleted} chat rooms and ${messagesDeleted} messages for user ${userId}`
    );

    return { chatRoomsDeleted, messagesDeleted };
  }

  /**
   * Remove chat rooms whose complaint no longer exists (legacy orphan cleanup).
   */
  static async cleanupOrphanedChatRoomsForParticipant(userId: string): Promise<number> {
    const snap = await getDocs(
      query(collection(db, this.CHAT_ROOMS_COLLECTION), where('participantIds', 'array-contains', userId))
    );

    let cleaned = 0;

    for (const roomDoc of snap.docs) {
      const data = roomDoc.data();
      const complaintId = data.complaintId as string | undefined;

      if (!complaintId) {
        const msgSnap = await getDocs(
          query(collection(db, this.MESSAGES_COLLECTION), where('chatRoomId', '==', roomDoc.id))
        );
        await this.batchDeleteDocs([
          ...msgSnap.docs.map((d) => d.ref),
          roomDoc.ref,
        ]);
        cleaned++;
        continue;
      }

      const complaintSnap = await getDoc(doc(db, 'complaints', complaintId));
      const complaintMissing = !complaintSnap.exists();
      const complainantRemoved =
        data.complainantId &&
        !(await getDoc(doc(db, 'users', data.complainantId as string))).exists();

      if (complaintMissing || complainantRemoved) {
        const msgSnap = await getDocs(
          query(collection(db, this.MESSAGES_COLLECTION), where('chatRoomId', '==', roomDoc.id))
        );
        await this.batchDeleteDocs([
          ...msgSnap.docs.map((d) => d.ref),
          roomDoc.ref,
        ]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 MessageService: cleaned ${cleaned} orphaned chat rooms for user ${userId}`);
    }

    return cleaned;
  }

  private static buildComplaintRoomQuery(
    complaintId: string,
    userId: string,
    asStaff = false
  ) {
    const chatRoomsRef = collection(db, this.CHAT_ROOMS_COLLECTION);

    if (asStaff) {
      return query(chatRoomsRef, where('complaintId', '==', complaintId));
    }

    return query(
      chatRoomsRef,
      where('complaintId', '==', complaintId),
      where('complainantId', '==', userId)
    );
  }

  private static async getLinkedChatRoomId(complaintId: string): Promise<string | null> {
    for (const collectionName of ['complaints', 'reports'] as const) {
      try {
        const snap = await getDoc(doc(db, collectionName, complaintId));
        if (snap.exists()) {
          const chatRoomId = snap.data().chatRoomId;
          if (typeof chatRoomId === 'string' && chatRoomId.trim()) {
            return chatRoomId;
          }
        }
      } catch {
        // Try the next collection
      }
    }
    return null;
  }

  private static async linkChatRoomToComplaint(
    complaintId: string,
    chatRoomId: string
  ): Promise<void> {
    for (const collectionName of ['complaints', 'reports'] as const) {
      try {
        const ref = doc(db, collectionName, complaintId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, { chatRoomId });
        }
      } catch (error) {
        console.warn(`Could not link chat room on ${collectionName}/${complaintId}:`, error);
      }
    }
  }

  private static mapChatRoomDoc(roomDoc: { id: string; data: () => Record<string, unknown> }): ChatRoom {
    return {
      id: roomDoc.id,
      ...roomDoc.data(),
    } as ChatRoom;
  }

  private static async queryChatRoomsForComplaint(
    complaintId: string,
    userId: string,
    options?: { asStaff?: boolean; complainantId?: string }
  ) {
    const asStaff = options?.asStaff ?? false;

    if (asStaff) {
      const { RepresentativeService } = await import('./representativeService');
      await RepresentativeService.ensureStaffProfileForUser(userId);
    }

    const linkedRoomId = await this.getLinkedChatRoomId(complaintId);
    if (linkedRoomId) {
      const linkedRoom = await this.getChatRoom(linkedRoomId);
      if (linkedRoom) {
        return [linkedRoom];
      }
    }

    const attempts = [
      this.buildComplaintRoomQuery(
        complaintId,
        asStaff && options?.complainantId ? options.complainantId : userId,
        asStaff && !options?.complainantId
      ),
    ];

    if (asStaff && options?.complainantId) {
      attempts.push(this.buildComplaintRoomQuery(complaintId, options.complainantId, false));
    }

    attempts.push(
      query(
        collection(db, this.CHAT_ROOMS_COLLECTION),
        where('complaintId', '==', complaintId),
        where('participantIds', 'array-contains', userId)
      )
    );

    for (const roomQuery of attempts) {
      const snapshot = await getDocs(roomQuery);
      if (!snapshot.empty) {
        return snapshot.docs.map((roomDoc) => this.mapChatRoomDoc(roomDoc));
      }
    }

    return [];
  }

  /**
   * Merge duplicate chat rooms that share the same complaintId.
   */
  static async dedupeChatRoomsForUser(userId: string): Promise<number> {
    const snap = await getDocs(
      query(collection(db, this.CHAT_ROOMS_COLLECTION), where('participantIds', 'array-contains', userId))
    );

    const complaintIds = new Set<string>();
    snap.docs.forEach((roomDoc) => {
      const complaintId = roomDoc.data().complaintId as string | undefined;
      if (complaintId) complaintIds.add(complaintId);
    });

    let merged = 0;
    for (const complaintId of complaintIds) {
      const roomForComplaint = snap.docs.find((roomDoc) => roomDoc.data().complaintId === complaintId);
      const asStaff = roomForComplaint?.data().complainantId !== userId;
      merged += await this.mergeDuplicateChatRoomsForComplaint(complaintId, userId, { asStaff });
    }

    if (merged > 0) {
      console.log(`🧹 MessageService: merged ${merged} duplicate chat rooms for user ${userId}`);
    }

    return merged;
  }

  static async mergeDuplicateChatRoomsForComplaint(
    complaintId: string,
    userId: string,
    options?: { asStaff?: boolean }
  ): Promise<number> {
    const snap = await getDocs(
      this.buildComplaintRoomQuery(complaintId, userId, options?.asStaff ?? false)
    );

    if (snap.docs.length <= 1) return 0;

    const primary = this.pickPrimaryRoomDoc(snap.docs);
    const duplicates = snap.docs.filter((roomDoc) => roomDoc.id !== primary.id);

    const primaryRaw = primary.data();
    let participantIds = [...((primaryRaw.participantIds as string[] | undefined) || [])];
    let participants = {
      ...((primaryRaw.participants as ChatRoom['participants'] | undefined) || {}),
    };
    const unreadCount = {
      ...((primaryRaw.unreadCount as ChatRoom['unreadCount'] | undefined) || {}),
    };

    for (const dup of duplicates) {
      const dupRaw = dup.data();

      participantIds = [
        ...new Set([
          ...participantIds,
          ...((dupRaw.participantIds as string[] | undefined) || []),
        ]),
      ];
      participants = {
        ...participants,
        ...((dupRaw.participants as ChatRoom['participants'] | undefined) || {}),
      };

      for (const [uid, count] of Object.entries(
        (dupRaw.unreadCount as ChatRoom['unreadCount'] | undefined) || {}
      )) {
        unreadCount[uid] = (unreadCount[uid] || 0) + (count as number);
      }

      const msgSnap = await getDocs(
        query(collection(db, this.MESSAGES_COLLECTION), where('chatRoomId', '==', dup.id))
      );

      for (const msgDoc of msgSnap.docs) {
        await updateDoc(msgDoc.ref, { chatRoomId: primary.id });
      }

      await deleteDoc(dup.ref);
    }

    await updateDoc(doc(db, this.CHAT_ROOMS_COLLECTION, primary.id), {
      participantIds,
      participants,
      unreadCount,
      updatedAt: Timestamp.now(),
    });

    return duplicates.length;
  }

  private static toMillis(value: unknown): number {
    if (!value) return 0;
    if (typeof value === 'object' && value !== null) {
      if ('toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
      }
      if ('toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().getTime();
      }
    }
    const parsed = new Date(value as string | number);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private static pickPrimaryRoomDoc(
    docs: Array<{ id: string; data: () => Record<string, unknown> }>
  ) {
    return [...docs].sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      const aHasLast = aData.lastMessage ? 1 : 0;
      const bHasLast = bData.lastMessage ? 1 : 0;
      if (aHasLast !== bHasLast) return bHasLast - aHasLast;
      return this.toMillis(bData.updatedAt) - this.toMillis(aData.updatedAt);
    })[0];
  }

  private static dedupeRoomsByComplaint(rooms: ChatRoom[]): ChatRoom[] {
    const byComplaint = new Map<string, ChatRoom>();

    for (const room of rooms) {
      const key = room.complaintId || room.id;
      const existing = byComplaint.get(key);
      if (!existing) {
        byComplaint.set(key, room);
        continue;
      }

      const existingScore =
        (existing.lastMessage ? 2 : 0) + this.toMillis(existing.updatedAt);
      const roomScore = (room.lastMessage ? 2 : 0) + this.toMillis(room.updatedAt);

      if (roomScore >= existingScore) {
        byComplaint.set(key, room);
      }
    }

    return Array.from(byComplaint.values()).sort(
      (a, b) => this.toMillis(b.updatedAt) - this.toMillis(a.updatedAt)
    );
  }

  private static async batchDeleteDocs(refs: ReturnType<typeof doc>[]): Promise<number> {
    if (refs.length === 0) return 0;

    let deletedCount = 0;
    for (let i = 0; i < refs.length; i += this.MAX_BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = refs.slice(i, i + this.MAX_BATCH_SIZE);
      chunk.forEach((ref) => {
        batch.delete(ref);
        deletedCount++;
      });
      await batch.commit();
    }
    return deletedCount;
  }

  /**
   * Get or create chat room for a complaint
   */
  static async getOrCreateChatRoom(
    complaintId: string,
    complaintTitle: string,
    complainantId: string,
    complainantName: string,
    handlerId?: string,
    handlerName?: string,
    options?: { requestingUserId?: string; asStaff?: boolean; complainantId?: string }
  ): Promise<ChatRoom> {
    try {
      const requesterId = options?.requestingUserId ?? complainantId;
      const asStaff = options?.asStaff ?? false;

      const existingRooms = await this.queryChatRoomsForComplaint(complaintId, requesterId, {
        asStaff,
        complainantId,
      });

      if (existingRooms.length > 0) {
        if (existingRooms.length > 1) {
          await this.mergeDuplicateChatRoomsForComplaint(complaintId, requesterId, { asStaff });
          const mergedRoom = await this.getChatRoomByComplaint(complaintId, requesterId, {
            asStaff,
            complainantId,
          });
          if (mergedRoom) return mergedRoom;
        }

        return existingRooms[0];
      }

      // Create new chat room
      const now = Timestamp.now();
      const participants: ChatRoom['participants'] = {
        [complainantId]: {
          name: complainantName,
          role: 'complainant',
          joinedAt: now,
        },
      };

      const participantIds = [complainantId];

      if (handlerId && handlerName) {
        participants[handlerId] = {
          name: handlerName,
          role: 'handler',
          joinedAt: now,
        };
        participantIds.push(handlerId);
      }

      const chatRoomData: Omit<ChatRoom, 'id'> = {
        complaintId,
        complaintTitle,
        complainantId,
        complainantName,
        handlerId: handlerId || null,
        handlerName: handlerName || null,
        participantIds,
        participants,
        status: 'active',
        isActive: true,
        unreadCount: {},
        typingUsers: [],
        createdAt: now,
        updatedAt: now,
        settings: DEFAULT_CHAT_SETTINGS,
      };

      const docRef = await addDoc(collection(db, this.CHAT_ROOMS_COLLECTION), chatRoomData);

      try {
        await this.linkChatRoomToComplaint(complaintId, docRef.id);
      } catch (linkError) {
        console.warn('Could not link chat room to complaint:', linkError);
      }

      // Don't send automatic welcome message - let handler initiate conversation

      return {
        id: docRef.id,
        ...chatRoomData,
      } as ChatRoom;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Get chat room by ID
   */
  static async getChatRoom(chatRoomId: string): Promise<ChatRoom | null> {
    try {
      const docRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as ChatRoom;
    } catch (error) {
      console.error('Error getting chat room:', error);
      throw error;
    }
  }

  /**
   * Get chat room by complaint ID
   */
  static async getChatRoomByComplaint(
    complaintId: string,
    userId: string,
    options?: { asStaff?: boolean; complainantId?: string }
  ): Promise<ChatRoom | null> {
    try {
      const asStaff = options?.asStaff ?? false;
      const rooms = await this.queryChatRoomsForComplaint(complaintId, userId, options);

      if (rooms.length === 0) {
        return null;
      }

      if (rooms.length > 1) {
        await this.mergeDuplicateChatRoomsForComplaint(complaintId, userId, { asStaff });
        const refreshed = await this.queryChatRoomsForComplaint(complaintId, userId, options);
        if (refreshed.length === 0) return null;
        return refreshed[0];
      }

      return rooms[0];
    } catch (error) {
      console.error('Error getting chat room by complaint:', error);
      throw error;
    }
  }

  /**
   * Send a text message
   */
  static async sendMessage(
    chatRoomId: string,
    complaintId: string,
    senderId: string,
    senderName: string,
    senderRole: 'complainant' | 'handler' | 'admin' | 'codi',
    content: string,
    attachments?: MessageAttachment[]
  ): Promise<Message> {
    try {
      const now = Timestamp.now();
      const messagesRef = collection(db, this.MESSAGES_COLLECTION);

      const messageData: Omit<Message, 'id'> = {
        chatRoomId,
        complaintId,
        senderId,
        senderName,
        senderRole,
        type: attachments && attachments.length > 0 ? 'file' : 'text',
        content,
        attachments: attachments || [], // Default to empty array instead of undefined
        status: 'sent',
        createdAt: now,
        readBy: [senderId], // Sender has read their own message
        readAt: {
          [senderId]: now,
        },
      };

      const docRef = await addDoc(messagesRef, messageData);

      // Update chat room with last message
      await this.updateChatRoomLastMessage(chatRoomId, {
        content: content.substring(0, 100),
        senderId,
        senderName,
        createdAt: now,
      });

      // Increment unread count for other participants
      await this.incrementUnreadCount(chatRoomId, senderId);

      // Send notification to recipient
      try {
        // Get chat room to determine recipient
        const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
        const chatRoomSnap = await getDoc(chatRoomRef);
        
        if (chatRoomSnap.exists()) {
          const chatRoom = chatRoomSnap.data() as ChatRoom;
          const recipientId = senderId === chatRoom.complainantId 
            ? chatRoom.handlerId 
            : chatRoom.complainantId;
          
          if (recipientId) {
            // Check if complaint is anonymous
            let isAnonymous = false;
            try {
              const complaintRef = doc(db, 'complaints', complaintId);
              const complaintSnap = await getDoc(complaintRef);
              if (complaintSnap.exists()) {
                isAnonymous = complaintSnap.data()?.isAnonymous === true;
              }
            } catch (err) {
              console.warn('Could not check anonymous status:', err);
            }

            // Use "Anonymous" if complaint is anonymous, otherwise use sender name
            const displayName = isAnonymous ? 'Anonymous' : senderName;
            const preview = content.length > 50 ? `${content.substring(0, 50)}...` : content;
            
            await NotificationService.createNotification(
              recipientId,
              'new_message',
              'New Message',
              `${displayName} sent you a message: "${preview}"`,
              {
                priority: 'normal',
                complaintId,
                chatRoomId,
                messageId: docRef.id,
                actionUrl: `/case-chat/${complaintId}`,
                actionLabel: 'View Message'
              }
            );
            console.log('✅ Message notification sent to recipient');
          }
        }
      } catch (notifError) {
        console.error('⚠️ Failed to send message notification:', notifError);
        // Don't fail message sending if notification fails
      }

      return {
        id: docRef.id,
        ...messageData,
      } as Message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send system message
   */
  static async sendSystemMessage(
    chatRoomId: string,
    complaintId: string,
    content: string
  ): Promise<Message> {
    try {
      const now = Timestamp.now();
      const messagesRef = collection(db, this.MESSAGES_COLLECTION);

      const messageData = {
        ...createSystemMessage(chatRoomId, complaintId, content),
        createdAt: now,
      };

      const docRef = await addDoc(messagesRef, messageData);

      return {
        id: docRef.id,
        ...messageData,
      } as Message;
    } catch (error) {
      console.error('Error sending system message:', error);
      throw error;
    }
  }

  /**
   * Upload file attachment to Cloudinary
   */
  static async uploadAttachment(
    file: File,
    chatRoomId: string,
    senderId: string
  ): Promise<MessageAttachment> {
    try {
      console.log('📤 Starting Cloudinary upload for chat:', { fileName: file.name, fileSize: file.size, chatRoomId });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`;
      console.log('🔗 Upload URL:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Cloudinary response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Cloudinary error response:', errorData);
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('✅ Cloudinary upload success:', { publicId: data.public_id, url: data.secure_url });
      
      const url = data.secure_url;

      const attachment: MessageAttachment = {
        id: data.public_id,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: Timestamp.now(),
      };

      console.log('💾 Attachment object created:', attachment);
      return attachment;
    } catch (error) {
      console.error('❌ Error uploading attachment to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Subscribe to messages in a chat room (real-time)
   */
  static subscribeToMessages(
    chatRoomId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const messagesRef = collection(db, this.MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where('chatRoomId', '==', chatRoomId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      callback(messages);
    });
  }

  /**
   * Subscribe to chat room updates (real-time)
   */
  static subscribeToChatRoom(
    chatRoomId: string,
    callback: (chatRoom: ChatRoom) => void
  ): Unsubscribe {
    const docRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);

    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatRoom = {
          id: snapshot.id,
          ...snapshot.data(),
        } as ChatRoom;
        callback(chatRoom);
      }
    });
  }

  /**
   * Subscribe to a user's chat rooms (real-time)
   */
  static subscribeToUserChatRooms(
    userId: string,
    callback: (chatRooms: ChatRoom[], meta?: { fromCache: boolean }) => void,
    options?: { limit?: number }
  ): Unsubscribe {
    const chatRoomsRef = collection(db, this.CHAT_ROOMS_COLLECTION);
    const q = query(
      chatRoomsRef,
      where('participantIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      ...(options?.limit ? [limit(options.limit)] : [])
    );

    return onSnapshot(q, (snapshot) => {
      const rooms = this.dedupeRoomsByComplaint(
        snapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((room) => !(room as ChatRoom & { isDeleted?: boolean }).isDeleted) as ChatRoom[]
      );
      callback(rooms, { fromCache: snapshot.metadata.fromCache });
    });
  }

  /**
   * Mark message as read
   */
  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return;
      }

      const message = messageSnap.data() as Message;

      // Don't mark if already read by this user
      if (message.readBy.includes(userId)) {
        return;
      }

      await updateDoc(messageRef, {
        readBy: [...message.readBy, userId],
        [`readAt.${userId}`]: Timestamp.now(),
        status: 'read',
      });
    } catch (error) {
      console.warn('Error marking message as read:', error);
    }
  }

  /**
   * Mark all messages as read for a user in a chat room
   */
  static async markAllAsRead(chatRoomId: string, userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, this.MESSAGES_COLLECTION);
      const q = query(messagesRef, where('chatRoomId', '==', chatRoomId));
      const snapshot = await getDocs(q);

      await Promise.all(
        snapshot.docs.map(async (messageDoc) => {
          const message = messageDoc.data() as Message;

          if (message.readBy.includes(userId) || message.senderId === userId) {
            return;
          }

          try {
            await updateDoc(messageDoc.ref, {
              readBy: [...message.readBy, userId],
              [`readAt.${userId}`]: Timestamp.now(),
              status: 'read',
            });
          } catch (error) {
            console.warn('Could not mark message as read:', messageDoc.id, error);
          }
        })
      );
    } catch (error) {
      console.warn('Error loading messages to mark as read:', error);
    }

    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      await updateDoc(chatRoomRef, {
        [`unreadCount.${userId}`]: 0,
      });
    } catch (error) {
      console.error('Error resetting chat unread count:', error);
      throw error;
    }
  }

  /**
   * Set typing indicator
   */
  static async setTyping(
    chatRoomId: string,
    userId: string,
    userName: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists()) {
        return;
      }

      const chatRoom = chatRoomSnap.data() as ChatRoom;
      let typingUsers = chatRoom.typingUsers || [];

      if (isTyping) {
        // Add user to typing list if not already there
        if (!typingUsers.includes(userId)) {
          typingUsers.push(userId);
        }
      } else {
        // Remove user from typing list
        typingUsers = typingUsers.filter((id) => id !== userId);
      }

      await updateDoc(chatRoomRef, {
        typingUsers,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  /**
   * Get user's chat rooms
   */
  static async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    try {
      const chatRoomsRef = collection(db, this.CHAT_ROOMS_COLLECTION);
      const q = query(
        chatRoomsRef,
        where('participantIds', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatRoom[];
    } catch (error) {
      console.error('Error getting user chat rooms:', error);
      throw error;
    }
  }

  /**
   * Close chat room
   */
  static async closeChatRoom(chatRoomId: string, closedBy: string): Promise<void> {
    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      
      await updateDoc(chatRoomRef, {
        status: 'closed',
        isActive: false,
        closedAt: Timestamp.now(),
        closedBy,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error closing chat room:', error);
      throw error;
    }
  }

  /**
   * Reopen chat room
   */
  static async reopenChatRoom(chatRoomId: string): Promise<void> {
    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      
      await updateDoc(chatRoomRef, {
        status: 'active',
        isActive: true,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error reopening chat room:', error);
      throw error;
    }
  }

  /**
   * Add handler to chat room
   */
  static async addHandler(
    chatRoomId: string,
    handlerId: string,
    handlerName: string
  ): Promise<void> {
    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists()) {
        throw new Error('Chat room not found');
      }

      const chatRoom = chatRoomSnap.data() as ChatRoom;

      // Update participants
      const participants = {
        ...chatRoom.participants,
        [handlerId]: {
          name: handlerName,
          role: 'handler' as const,
          joinedAt: Timestamp.now(),
        },
      };

      const participantIds = [...chatRoom.participantIds];
      if (!participantIds.includes(handlerId)) {
        participantIds.push(handlerId);
      }

      await updateDoc(chatRoomRef, {
        handlerId,
        handlerName,
        participants,
        participantIds,
        updatedAt: Timestamp.now(),
      });

      const nameChanged =
        chatRoom.handlerId === handlerId && chatRoom.handlerName !== handlerName;
      const isNewHandler = chatRoom.handlerId !== handlerId;

      if (isNewHandler) {
        await this.sendSystemMessage(
          chatRoomId,
          chatRoom.complaintId,
          `${handlerName} has been assigned to handle your case.`
        );
      } else if (nameChanged) {
        // Name-only correction — no duplicate assignment notice
      }
    } catch (error) {
      console.error('Error adding handler:', error);
      throw error;
    }
  }

  /**
   * Update handler display name when auth name differs from representative nickname.
   */
  static async updateHandlerDisplayName(
    chatRoomId: string,
    handlerId: string,
    handlerName: string
  ): Promise<void> {
    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists()) return;

      const chatRoom = chatRoomSnap.data() as ChatRoom;
      if (chatRoom.handlerId !== handlerId || chatRoom.handlerName === handlerName) {
        return;
      }

      const participants = {
        ...chatRoom.participants,
        [handlerId]: {
          ...chatRoom.participants[handlerId],
          name: handlerName,
          role: 'handler' as const,
          joinedAt: chatRoom.participants[handlerId]?.joinedAt || Timestamp.now(),
        },
      };

      await updateDoc(chatRoomRef, {
        handlerName,
        participants,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating handler display name:', error);
    }
  }

  /**
   * Private: Update chat room last message
   */
  private static async updateChatRoomLastMessage(
    chatRoomId: string,
    lastMessage: ChatRoom['lastMessage']
  ): Promise<void> {
    const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
    await updateDoc(chatRoomRef, {
      lastMessage,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Private: Increment unread count for all participants except sender
   */
  private static async incrementUnreadCount(
    chatRoomId: string,
    senderId: string
  ): Promise<void> {
    try {
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists()) {
        return;
      }

      const chatRoom = chatRoomSnap.data() as ChatRoom;
      const updates: any = {};

      // Increment unread count for all participants except sender
      chatRoom.participantIds.forEach((participantId) => {
        if (participantId !== senderId) {
          const currentCount = chatRoom.unreadCount[participantId] || 0;
          updates[`unreadCount.${participantId}`] = currentCount + 1;
        }
      });

      if (Object.keys(updates).length > 0) {
        await updateDoc(chatRoomRef, updates);
      }
    } catch (error) {
      console.error('Error incrementing unread count:', error);
    }
  }
}

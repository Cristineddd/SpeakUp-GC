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

  /**
   * Get or create chat room for a complaint
   */
  static async getOrCreateChatRoom(
    complaintId: string,
    complaintTitle: string,
    complainantId: string,
    complainantName: string,
    handlerId?: string,
    handlerName?: string
  ): Promise<ChatRoom> {
    try {
      // Check if chat room already exists
      const chatRoomsRef = collection(db, this.CHAT_ROOMS_COLLECTION);
      const q = query(chatRoomsRef, where('complaintId', '==', complaintId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existingRoom = snapshot.docs[0];
        return {
          id: existingRoom.id,
          ...existingRoom.data(),
        } as ChatRoom;
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

      const docRef = await addDoc(chatRoomsRef, chatRoomData);

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
  static async getChatRoomByComplaint(complaintId: string): Promise<ChatRoom | null> {
    try {
      const chatRoomsRef = collection(db, this.CHAT_ROOMS_COLLECTION);
      const q = query(chatRoomsRef, where('complaintId', '==', complaintId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as ChatRoom;
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
    callback: (chatRooms: ChatRoom[]) => void,
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
      const rooms = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatRoom[];
      callback(rooms);
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
        throw new Error('Message not found');
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
      console.error('Error marking message as read:', error);
      throw error;
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

      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        const message = doc.data() as Message;
        
        // Skip if already read or sent by this user
        if (message.readBy.includes(userId) || message.senderId === userId) {
          return;
        }

        batch.update(doc.ref, {
          readBy: [...message.readBy, userId],
          [`readAt.${userId}`]: Timestamp.now(),
          status: 'read',
        });
      });

      await batch.commit();

      // Reset unread count for this user
      const chatRoomRef = doc(db, this.CHAT_ROOMS_COLLECTION, chatRoomId);
      await updateDoc(chatRoomRef, {
        [`unreadCount.${userId}`]: 0,
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
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

      // Send system message
      await this.sendSystemMessage(
        chatRoomId,
        chatRoom.complaintId,
        `${handlerName} has been assigned to handle your case.`
      );
    } catch (error) {
      console.error('Error adding handler:', error);
      throw error;
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

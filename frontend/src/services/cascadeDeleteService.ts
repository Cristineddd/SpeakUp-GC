/**
 * Cascade Delete Service
 * Production-ready service for handling complete cleanup of related data
 * when users or complaints are deleted
 * 
 * Supports both soft delete (recommended) and hard delete (GDPR compliance)
 */

import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
  getDoc,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';

export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  archivedCount: number;
  errors?: string[];
}

export class CascadeDeleteService {
  private static MAX_BATCH_SIZE = 500;

  /**
   * SOFT DELETE USER - Marks user as deleted and cleans up related data
   * Recommended for production to maintain audit trails
   * 
   * @param userId - The user ID to soft delete
   * @param deletedBy - The admin/user ID performing the deletion
   * @returns DeleteResult with counts and status
   */
  static async softDeleteUser(
    userId: string,
    deletedBy: string
  ): Promise<DeleteResult> {
    try {
      console.log(`🗑️ Starting soft delete for user: ${userId}`);

      let deletedCount = 0;
      let archivedCount = 0;
      const errors: string[] = [];
      const timestamp = Timestamp.now();

      // Step 1: Mark user as deleted
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const batch = writeBatch(db);
          batch.update(userRef, {
            isDeleted: true,
            isActive: false,
            deletedAt: timestamp,
            deletedBy: deletedBy
          });
          await batch.commit();
          archivedCount++;
          console.log('   ✅ User document marked as deleted');
        }

        // Mark registered user as deleted
        const userEmail = userDoc.data()?.email;
        if (userEmail) {
          const registeredUserRef = doc(db, 'registeredUsers', userEmail);
          const registeredDoc = await getDoc(registeredUserRef);
          
          if (registeredDoc.exists()) {
            const batch = writeBatch(db);
            batch.update(registeredUserRef, {
              isDeleted: true,
              deletedAt: timestamp
            });
            await batch.commit();
            archivedCount++;
            console.log('   ✅ Registered user marked as deleted');
          }
        }
      } catch (error) {
        console.error('   ❌ Error deleting user document:', error);
        errors.push(`User document: ${error.message}`);
      }

      // Step 2: Soft delete all complaints by this user
      try {
        const complaintsQuery = query(
          collection(db, 'complaints'),
          where('userId', '==', userId)
        );
        const complaintsSnap = await getDocs(complaintsQuery);

        console.log(`   📋 Found ${complaintsSnap.size} complaints to delete`);

        for (const complaintDoc of complaintsSnap.docs) {
          try {
            const result = await this.softDeleteComplaint(
              complaintDoc.id,
              deletedBy,
              true // Skip creating new batch, we'll handle it
            );
            deletedCount += result.deletedCount;
            archivedCount += result.archivedCount;
          } catch (error) {
            console.error(`   ❌ Error deleting complaint ${complaintDoc.id}:`, error);
            errors.push(`Complaint ${complaintDoc.id}: ${error.message}`);
          }
        }
      } catch (error) {
        console.error('   ❌ Error querying complaints:', error);
        errors.push(`Complaints query: ${error.message}`);
      }

      // Step 3: Delete notifications (hard delete - no audit value)
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', userId)
        );
        const notificationsSnap = await getDocs(notificationsQuery);

        if (notificationsSnap.size > 0) {
          const deleted = await this.batchDelete(
            notificationsSnap.docs.map(d => d.ref)
          );
          deletedCount += deleted;
          console.log(`   ✅ Deleted ${deleted} notifications`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting notifications:', error);
        errors.push(`Notifications: ${error.message}`);
      }

      // Step 4: Update chat rooms (remove from participantIds)
      try {
        const chatRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('participantIds', 'array-contains', userId)
        );
        const chatRoomsSnap = await getDocs(chatRoomsQuery);

        if (chatRoomsSnap.size > 0) {
          const batch = writeBatch(db);
          let count = 0;

          chatRoomsSnap.forEach(chatRoomDoc => {
            const data = chatRoomDoc.data();
            const updatedParticipantIds = (data.participantIds || []).filter(
              (id: string) => id !== userId
            );

            batch.update(chatRoomDoc.ref, {
              participantIds: updatedParticipantIds,
              isDeleted: updatedParticipantIds.length === 0,
              updatedAt: timestamp
            });
            count++;
          });

          await batch.commit();
          archivedCount += count;
          console.log(`   ✅ Updated ${count} chat rooms`);
        }
      } catch (error) {
        console.error('   ❌ Error updating chat rooms:', error);
        errors.push(`Chat rooms: ${error.message}`);
      }

      // Step 5: Soft delete messages sent by this user
      try {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('senderId', '==', userId)
        );
        const messagesSnap = await getDocs(messagesQuery);

        if (messagesSnap.size > 0) {
          const batch = writeBatch(db);
          let count = 0;

          messagesSnap.forEach(msgDoc => {
            batch.update(msgDoc.ref, {
              isDeleted: true,
              deletedAt: timestamp,
              content: '[Message deleted]'
            });
            count++;
          });

          await batch.commit();
          archivedCount += count;
          console.log(`   ✅ Soft deleted ${count} messages`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting messages:', error);
        errors.push(`Messages: ${error.message}`);
      }

      // Step 6: Delete representative record if exists
      try {
        const representativesQuery = query(
          collection(db, 'representatives'),
          where('userId', '==', userId)
        );
        const representativesSnap = await getDocs(representativesQuery);

        if (representativesSnap.size > 0) {
          const deleted = await this.batchDelete(
            representativesSnap.docs.map(d => d.ref)
          );
          deletedCount += deleted;
          console.log(`   ✅ Deleted ${deleted} representative records`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting representatives:', error);
        errors.push(`Representatives: ${error.message}`);
      }

      console.log(`✅ Soft delete completed for user ${userId}`);
      console.log(`   📊 Hard deleted: ${deletedCount} records`);
      console.log(`   📦 Soft deleted: ${archivedCount} records`);

      return {
        success: errors.length === 0,
        deletedCount,
        archivedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ Fatal error in soft delete user:', error);
      return {
        success: false,
        deletedCount: 0,
        archivedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * SOFT DELETE COMPLAINT - Marks complaint as deleted and cleans up related data
   * 
   * @param complaintId - The complaint ID to soft delete
   * @param deletedBy - The admin/user ID performing the deletion
   * @param skipBatch - If true, doesn't commit (for use within larger transactions)
   * @returns DeleteResult with counts and status
   */
  static async softDeleteComplaint(
    complaintId: string,
    deletedBy: string,
    skipBatch: boolean = false
  ): Promise<DeleteResult> {
    try {
      console.log(`🗑️ Soft deleting complaint: ${complaintId}`);

      let deletedCount = 0;
      let archivedCount = 0;
      const errors: string[] = [];
      const timestamp = Timestamp.now();

      // Step 1: Mark complaint as deleted
      try {
        const complaintRef = doc(db, 'complaints', complaintId);
        const complaintDoc = await getDoc(complaintRef);

        if (!complaintDoc.exists()) {
          console.warn(`   ⚠️ Complaint ${complaintId} not found`);
          return { success: false, deletedCount: 0, archivedCount: 0 };
        }

        const complaintData = complaintDoc.data();
        const batch = writeBatch(db);

        batch.update(complaintRef, {
          isDeleted: true,
          status: 'deleted',
          deletedAt: timestamp,
          deletedBy: deletedBy
        });
        archivedCount++;

        // Step 2: Update representative stats if assigned
        if (complaintData.handlerId) {
          const repQuery = query(
            collection(db, 'representatives'),
            where('userId', '==', complaintData.handlerId)
          );
          const repSnap = await getDocs(repQuery);

          if (!repSnap.empty) {
            const repDoc = repSnap.docs[0];
            const repData = repDoc.data();
            const newActiveCases = Math.max(0, (repData.activeCases || 0) - 1);

            batch.update(repDoc.ref, {
              activeCases: newActiveCases,
              updatedAt: timestamp
            });

            console.log(
              `   ✅ Updated rep ${repData.displayName}: activeCases ${repData.activeCases} → ${newActiveCases}`
            );
          }
        }

        await batch.commit();
        console.log('   ✅ Complaint marked as deleted');
      } catch (error) {
        console.error('   ❌ Error marking complaint as deleted:', error);
        errors.push(`Complaint update: ${error.message}`);
      }

      // Step 3: Soft delete chat rooms
      try {
        const chatRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('complaintId', '==', complaintId)
        );
        const chatRoomsSnap = await getDocs(chatRoomsQuery);

        if (chatRoomsSnap.size > 0) {
          const batch = writeBatch(db);
          chatRoomsSnap.forEach(doc => {
            batch.update(doc.ref, {
              isDeleted: true,
              status: 'closed',
              deletedAt: timestamp
            });
          });
          await batch.commit();
          archivedCount += chatRoomsSnap.size;
          console.log(`   ✅ Soft deleted ${chatRoomsSnap.size} chat rooms`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting chat rooms:', error);
        errors.push(`Chat rooms: ${error.message}`);
      }

      // Step 4: Soft delete messages
      try {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('complaintId', '==', complaintId)
        );
        const messagesSnap = await getDocs(messagesQuery);

        if (messagesSnap.size > 0) {
          const batch = writeBatch(db);
          messagesSnap.forEach(doc => {
            batch.update(doc.ref, {
              isDeleted: true,
              deletedAt: timestamp
            });
          });
          await batch.commit();
          archivedCount += messagesSnap.size;
          console.log(`   ✅ Soft deleted ${messagesSnap.size} messages`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting messages:', error);
        errors.push(`Messages: ${error.message}`);
      }

      // Step 5: Delete notifications (hard delete)
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('complaintId', '==', complaintId)
        );
        const notificationsSnap = await getDocs(notificationsQuery);

        if (notificationsSnap.size > 0) {
          const deleted = await this.batchDelete(
            notificationsSnap.docs.map(d => d.ref)
          );
          deletedCount += deleted;
          console.log(`   ✅ Deleted ${deleted} notifications`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting notifications:', error);
        errors.push(`Notifications: ${error.message}`);
      }

      // Step 6: Soft delete case activities
      try {
        const activitiesQuery = query(
          collection(db, 'caseActivities'),
          where('complaintId', '==', complaintId)
        );
        const activitiesSnap = await getDocs(activitiesQuery);

        if (activitiesSnap.size > 0) {
          const batch = writeBatch(db);
          activitiesSnap.forEach(doc => {
            batch.update(doc.ref, {
              isDeleted: true,
              deletedAt: timestamp
            });
          });
          await batch.commit();
          archivedCount += activitiesSnap.size;
          console.log(`   ✅ Soft deleted ${activitiesSnap.size} activities`);
        }
      } catch (error) {
        console.error('   ❌ Error deleting activities:', error);
        errors.push(`Activities: ${error.message}`);
      }

      console.log(`✅ Soft delete completed for complaint ${complaintId}`);

      return {
        success: errors.length === 0,
        deletedCount,
        archivedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ Fatal error in soft delete complaint:', error);
      return {
        success: false,
        deletedCount: 0,
        archivedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * HARD DELETE USER - Permanently removes user and all related data
   * Use only when legally required (GDPR right to be forgotten)
   * 
   * @param userId - The user ID to permanently delete
   * @returns DeleteResult with counts and status
   */
  static async hardDeleteUser(userId: string): Promise<DeleteResult> {
    try {
      console.log(`🗑️ Starting HARD DELETE for user: ${userId} (PERMANENT)`);

      let deletedCount = 0;
      const errors: string[] = [];

      const collectionsToDelete = [
        { name: 'users', field: 'uid' },
        { name: 'complaints', field: 'userId' },
        { name: 'notifications', field: 'userId' },
        { name: 'messages', field: 'senderId' },
        { name: 'representatives', field: 'userId' }
      ];

      for (const { name, field } of collectionsToDelete) {
        try {
          const q = query(collection(db, name), where(field, '==', userId));
          const snapshot = await getDocs(q);

          if (snapshot.size > 0) {
            const deleted = await this.batchDelete(snapshot.docs.map(d => d.ref));
            deletedCount += deleted;
            console.log(`   ✅ Deleted ${deleted} docs from ${name}`);
          }
        } catch (error) {
          console.error(`   ❌ Error deleting from ${name}:`, error);
          errors.push(`${name}: ${error.message}`);
        }
      }

      // Clean up chat rooms
      try {
        const chatRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('participantIds', 'array-contains', userId)
        );
        const chatRoomsSnap = await getDocs(chatRoomsQuery);

        if (chatRoomsSnap.size > 0) {
          const batch = writeBatch(db);
          let count = 0;

          chatRoomsSnap.forEach(chatRoomDoc => {
            const data = chatRoomDoc.data();
            const updatedParticipantIds = (data.participantIds || []).filter(
              (id: string) => id !== userId
            );

            if (updatedParticipantIds.length === 0) {
              batch.delete(chatRoomDoc.ref);
            } else {
              batch.update(chatRoomDoc.ref, {
                participantIds: updatedParticipantIds
              });
            }
            count++;
          });

          await batch.commit();
          deletedCount += count;
          console.log(`   ✅ Cleaned up ${count} chat rooms`);
        }
      } catch (error) {
        console.error('   ❌ Error cleaning chat rooms:', error);
        errors.push(`Chat rooms: ${error.message}`);
      }

      console.log(`✅ HARD DELETE completed for user ${userId}`);
      console.log(`   📊 Total deleted: ${deletedCount} records`);

      return {
        success: errors.length === 0,
        deletedCount,
        archivedCount: 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ Fatal error in hard delete user:', error);
      return {
        success: false,
        deletedCount: 0,
        archivedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Helper: Delete documents in batches
   */
  private static async batchDelete(
    refs: DocumentReference[]
  ): Promise<number> {
    if (refs.length === 0) return 0;

    let deletedCount = 0;
    const batches = [];

    for (let i = 0; i < refs.length; i += this.MAX_BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = refs.slice(i, i + this.MAX_BATCH_SIZE);

      chunk.forEach(ref => {
        batch.delete(ref);
        deletedCount++;
      });

      batches.push(batch.commit());
    }

    await Promise.all(batches);
    return deletedCount;
  }
}

export default CascadeDeleteService;

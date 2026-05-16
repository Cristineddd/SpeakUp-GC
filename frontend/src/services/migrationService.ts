/**
 * Migration Service
 * One-time scripts to update existing Firestore data structure
 * Run these migrations ONCE in production to add soft delete support
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '../firebase';

export class MigrationService {
  private static readonly BATCH_SIZE = 500;

  /**
   * Migration 1: Add soft delete fields to all collections
   * Run this ONCE to initialize isDeleted, deletedAt, deletedBy fields
   */
  static async addSoftDeleteFields(): Promise<{
    success: boolean;
    collections: { [key: string]: number };
    errors: string[];
  }> {
    console.log('🔄 Starting migration: Add soft delete fields');

    const collections = [
      'users',
      'complaints',
      'chatRooms',
      'messages',
      'notifications'
    ];
    const results: { [key: string]: number } = {};
    const errors: string[] = [];

    for (const collectionName of collections) {
      try {
        console.log(`   📋 Migrating collection: ${collectionName}`);
        const count = await this.addFieldsToCollection(collectionName, {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        });
        results[collectionName] = count;
        console.log(`   ✅ Updated ${count} documents in ${collectionName}`);
      } catch (error) {
        console.error(`   ❌ Error migrating ${collectionName}:`, error);
        errors.push(`${collectionName}: ${error.message}`);
      }
    }

    console.log('✅ Migration complete!');
    console.log('   Results:', results);

    return {
      success: errors.length === 0,
      collections: results,
      errors
    };
  }

  /**
   * Migration 2: Remove assignedCases arrays from representatives
   * This migration cleans up denormalized data
   */
  static async removeAssignedCasesArrays(): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    console.log('🔄 Starting migration: Remove assignedCases arrays');

    const errors: string[] = [];
    let updated = 0;

    try {
      const representativesRef = collection(db, 'representatives');
      const snapshot = await getDocs(representativesRef);

      console.log(`   📋 Found ${snapshot.size} representatives`);

      const batches = [];
      let batch = writeBatch(db);
      let count = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        if (data.assignedCases && Array.isArray(data.assignedCases)) {
          batch.update(docSnap.ref, {
            assignedCases: null
          });
          count++;
          updated++;

          if (count >= this.BATCH_SIZE) {
            batches.push(batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        }
      }

      if (count > 0) {
        batches.push(batch.commit());
      }

      await Promise.all(batches);

      console.log(`✅ Migration complete! Updated ${updated} representatives`);

      return {
        success: true,
        updated,
        errors
      };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        updated,
        errors: [error.message]
      };
    }
  }

  /**
   * Migration 3: Recalculate representative stats from complaints
   * Run this after removing assignedCases arrays
   */
  static async recalculateRepresentativeStats(): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    console.log('🔄 Starting migration: Recalculate representative stats');

    const errors: string[] = [];
    let updated = 0;

    try {
      const representativesRef = collection(db, 'representatives');
      const repsSnapshot = await getDocs(representativesRef);

      console.log(`   📋 Found ${repsSnapshot.size} representatives`);

      for (const repDoc of repsSnapshot.docs) {
        try {
          const repData = repDoc.data();
          const userId = repData.userId;

          if (!userId) {
            console.warn(`   ⚠️ Rep ${repDoc.id} has no userId, skipping`);
            continue;
          }

          const complaintsRef = collection(db, 'complaints');
          const allCasesQuery = query(
            complaintsRef,
            // Note: where('handlerId', '==', userId) would be better but requires index
          );
          const allCasesSnap = await getDocs(allCasesQuery);

          const userCases = allCasesSnap.docs.filter(
            doc => doc.data().handlerId === userId
          );

          const activeCases = userCases.filter(doc => {
            const status = doc.data().status;
            const isDeleted = doc.data().isDeleted || false;
            return (
              !isDeleted &&
              !['resolved', 'dismissed', 'deleted', 'closed'].includes(status)
            );
          }).length;

          const resolvedCases = userCases.filter(doc => {
            const status = doc.data().status;
            return ['resolved', 'dismissed'].includes(status);
          }).length;

          const batch = writeBatch(db);
          batch.update(repDoc.ref, {
            activeCases,
            resolvedCases,
            totalCasesHandled: userCases.length
          });
          await batch.commit();

          updated++;
          console.log(
            `   ✅ Updated ${repData.displayName}: ${activeCases} active, ${resolvedCases} resolved`
          );
        } catch (error) {
          console.error(`   ❌ Error updating rep ${repDoc.id}:`, error);
          errors.push(`Rep ${repDoc.id}: ${error.message}`);
        }
      }

      console.log(`✅ Migration complete! Updated ${updated} representatives`);

      return {
        success: errors.length === 0,
        updated,
        errors
      };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        updated,
        errors: [error.message]
      };
    }
  }

  /**
   * Migration 4: Clean up orphaned data
   * Finds and optionally removes orphaned records
   */
  static async findOrphanedData(fix: boolean = false): Promise<{
    orphanedChats: number;
    orphanedMessages: number;
    orphanedNotifications: number;
    fixed: boolean;
    errors: string[];
  }> {
    console.log('🔍 Scanning for orphaned data...');

    let orphanedChats = 0;
    let orphanedMessages = 0;
    let orphanedNotifications = 0;
    const errors: string[] = [];

    try {
      const complaintsRef = collection(db, 'complaints');
      const complaintsSnap = await getDocs(complaintsRef);
      const validComplaintIds = new Set(complaintsSnap.docs.map(d => d.id));

      console.log(`   📋 Found ${validComplaintIds.size} valid complaints`);

      const chatRoomsRef = collection(db, 'chatRooms');
      const chatRoomsSnap = await getDocs(chatRoomsRef);

      const orphanedChatRoomIds: string[] = [];

      chatRoomsSnap.forEach(doc => {
        const data = doc.data();
        if (
          data.complaintId &&
          !validComplaintIds.has(data.complaintId) &&
          !data.isDeleted
        ) {
          orphanedChats++;
          orphanedChatRoomIds.push(doc.id);
          console.log(`   ⚠️ Orphaned chat room: ${doc.id} (complaint: ${data.complaintId})`);
        }
      });

      const messagesRef = collection(db, 'messages');
      const messagesSnap = await getDocs(messagesRef);

      const orphanedMessageIds: string[] = [];

      messagesSnap.forEach(doc => {
        const data = doc.data();
        if (
          data.complaintId &&
          !validComplaintIds.has(data.complaintId) &&
          !data.isDeleted
        ) {
          orphanedMessages++;
          orphanedMessageIds.push(doc.id);
        }
      });

      const notificationsRef = collection(db, 'notifications');
      const notificationsSnap = await getDocs(notificationsRef);

      const orphanedNotificationIds: string[] = [];

      notificationsSnap.forEach(doc => {
        const data = doc.data();
        if (data.complaintId && !validComplaintIds.has(data.complaintId)) {
          orphanedNotifications++;
          orphanedNotificationIds.push(doc.id);
        }
      });

      console.log(`📊 Orphaned data found:`);
      console.log(`   - Chat rooms: ${orphanedChats}`);
      console.log(`   - Messages: ${orphanedMessages}`);
      console.log(`   - Notifications: ${orphanedNotifications}`);

      if (fix && (orphanedChats > 0 || orphanedMessages > 0 || orphanedNotifications > 0)) {
        console.log('🔧 Fixing orphaned data...');

        const allOrphanedRefs = [
          ...orphanedChatRoomIds.map(id => doc(db, 'chatRooms', id)),
          ...orphanedMessageIds.map(id => doc(db, 'messages', id)),
          ...orphanedNotificationIds.map(id => doc(db, 'notifications', id))
        ];

        const batches = [];
        let batch = writeBatch(db);
        let count = 0;

        allOrphanedRefs.forEach(ref => {
          batch.delete(ref);
          count++;

          if (count >= this.BATCH_SIZE) {
            batches.push(batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        });

        if (count > 0) {
          batches.push(batch.commit());
        }

        await Promise.all(batches);
        console.log(`✅ Deleted ${allOrphanedRefs.length} orphaned records`);
      }

      return {
        orphanedChats,
        orphanedMessages,
        orphanedNotifications,
        fixed: fix,
        errors
      };
    } catch (error) {
      console.error('❌ Error scanning for orphaned data:', error);
      return {
        orphanedChats,
        orphanedMessages,
        orphanedNotifications,
        fixed: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Helper: Add fields to a collection
   */
  private static async addFieldsToCollection(
    collectionName: string,
    fields: { [key: string]: any }
  ): Promise<number> {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.empty) {
      console.log(`   ℹ️ Collection ${collectionName} is empty, skipping`);
      return 0;
    }

    const batches = [];
    let batch = writeBatch(db);
    let count = 0;
    let updated = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      if (data.isDeleted === undefined) {
        batch.update(docSnap.ref, fields);
        count++;
        updated++;

        if (count >= this.BATCH_SIZE) {
          batches.push(batch.commit());
          batch = writeBatch(db);
          count = 0;
        }
      }
    }

    if (count > 0) {
      batches.push(batch.commit());
    }

    await Promise.all(batches);
    return updated;
  }

  /**
   * Run all migrations in sequence
   * Use this for one-time setup
   */
  static async runAllMigrations(): Promise<{
    success: boolean;
    results: { [key: string]: any };
    errors: string[];
  }> {
    console.log('🚀 Starting ALL migrations...\n');

    const results: { [key: string]: any } = {};
    const allErrors: string[] = [];

    console.log('=== MIGRATION 1: Add Soft Delete Fields ===');
    const migration1 = await this.addSoftDeleteFields();
    results.softDeleteFields = migration1;
    allErrors.push(...migration1.errors);
    console.log('');

    console.log('=== MIGRATION 2: Remove Assigned Cases Arrays ===');
    const migration2 = await this.removeAssignedCasesArrays();
    results.removeArrays = migration2;
    allErrors.push(...migration2.errors);
    console.log('');

    console.log('=== MIGRATION 3: Recalculate Representative Stats ===');
    const migration3 = await this.recalculateRepresentativeStats();
    results.recalculateStats = migration3;
    allErrors.push(...migration3.errors);
    console.log('');

    console.log('=== MIGRATION 4: Find Orphaned Data ===');
    const migration4 = await this.findOrphanedData(false);
    results.orphanedData = migration4;
    allErrors.push(...migration4.errors);
    console.log('');

    if (allErrors.length === 0) {
      console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    } else {
      console.log(`⚠️ Migrations completed with ${allErrors.length} errors`);
    }

    return {
      success: allErrors.length === 0,
      results,
      errors: allErrors
    };
  }
}

export default MigrationService;

/**
 * Escalation Service
 * Handles automatic and manual escalation of complaints
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  EscalationLevel,
  EscalationData,
  EscalationHistoryEntry,
  DEFAULT_ESCALATION_DATA,
} from '../types/escalation';
import {
  calculateHoursUnprocessed,
  calculateDaysUnprocessed,
  determineEscalationLevel,
  calculateSLADeadline,
  isSLABreached,
  getSLAStatus,
  ESCALATION_RULES,
} from '../types/escalation';
import { NotificationService } from './notificationService';

export class EscalationService {
  private static readonly COMPLAINTS_COLLECTION = 'complaints';

  /**
   * Assign complaint to handler and send notification to user
   */
  static async assignComplaintToHandler(
    complaintId: string,
    handlerId: string,
    handlerName: string,
    userId: string,
    complaintTitle: string // ADDED: Complaint title parameter
  ): Promise<void> {
    try {
      const complaintRef = doc(db, this.COMPLAINTS_COLLECTION, complaintId);
      const now = Timestamp.now();

      // Get complaint details for handler notification
      const complaintSnap = await getDoc(complaintRef);
      const complaintData = complaintSnap.data();

      // 1. Update complaint with handler assignment
      await updateDoc(complaintRef, {
        handlerId: handlerId,
        handlerName: handlerName,
        status: 'inProgress',
        assignedAt: now,
        updatedAt: now
      });

      // 2. Send notification to user (complainant) - FIXED: Added complaint title and handler name
      await NotificationService.sendComplaintAssignedNotification(
        userId,
        complaintId,
        complaintTitle, // ADDED: Complaint title
        handlerName     // ADDED: Handler name
      );

      // 3. Send notification to handler - NEW!
      if (complaintData) {
        await NotificationService.sendHandlerCaseAssignedNotification(
          handlerId,
          complaintId,
          complaintTitle,
          complaintData.complainantName || complaintData.userName || 'Anonymous',
          complaintData.category || complaintData.type || 'General',
          complaintData.severity || 'Medium'
        );
        console.log(`✅ Notification sent to handler ${handlerName}`);
      }

      console.log(`✅ Complaint ${complaintId} assigned to handler ${handlerName} and notifications sent to user ${userId} and handler ${handlerId}`);
    } catch (error) {
      console.error('Error assigning complaint to handler:', error);
      throw error;
    }
  }

  /**
   * Check and auto-escalate a single complaint
   */
  static async checkAndEscalate(
    complaintId: string,
    reportedAt: Date,
    currentStatus: string,
    category: string,
    currentEscalationLevel: EscalationLevel = 0
  ): Promise<{
    shouldEscalate: boolean;
    newLevel: EscalationLevel;
    hoursUnprocessed: number;
  }> {
    try {
      // Don't escalate resolved or dismissed cases
      if (currentStatus === 'resolved' || currentStatus === 'dismissed') {
        return { shouldEscalate: false, newLevel: currentEscalationLevel, hoursUnprocessed: 0 };
      }

      // Calculate time metrics
      const hoursUnprocessed = calculateHoursUnprocessed(reportedAt);
      const newLevel = determineEscalationLevel(hoursUnprocessed);

      // Check if escalation is needed
      const shouldEscalate = newLevel > currentEscalationLevel;

      console.log(`🔍 Escalation check for ${complaintId}:`, {
        hoursUnprocessed,
        currentLevel: currentEscalationLevel,
        newLevel,
        shouldEscalate,
      });

      return { shouldEscalate, newLevel, hoursUnprocessed };
    } catch (error) {
      console.error('Error checking escalation:', error);
      throw error;
    }
  }

  /**
   * Auto-escalate a complaint
   */
  static async autoEscalate(
    complaintId: string,
    newLevel: EscalationLevel,
    reportedAt: Date,
    category: string,
    currentEscalationData?: Partial<EscalationData>
  ): Promise<void> {
    try {
      const now = Timestamp.now();
      const hoursUnprocessed = calculateHoursUnprocessed(reportedAt);
      const daysUnprocessed = calculateDaysUnprocessed(reportedAt);

      // Calculate SLA
      const slaDeadline = calculateSLADeadline(reportedAt, category);
      const slaBreached = isSLABreached(reportedAt, category);

      // Create escalation history entry
      const historyEntry: EscalationHistoryEntry = {
        level: newLevel,
        previousLevel: currentEscalationData?.escalationLevel || 0,
        escalatedAt: now,
        escalatedBy: 'SYSTEM',
        escalatedByName: 'Auto-Escalation System',
        reason: `Automatically escalated after ${hoursUnprocessed} hours (>${ESCALATION_RULES.PRIORITY}hrs threshold)`,
        notes: `Case has been unprocessed for ${daysUnprocessed} days`,
        autoEscalated: true,
      };

      // Update complaint with escalation data
      const complaintRef = doc(db, this.COMPLAINTS_COLLECTION, complaintId);
      const escalationData: Partial<EscalationData> = {
        escalationLevel: newLevel,
        isEscalated: newLevel > 0,
        escalatedAt: now,
        autoEscalated: true,
        escalationReason: historyEntry.reason,
        escalationHistory: [
          ...(currentEscalationData?.escalationHistory || []),
          historyEntry,
        ],
        slaDeadline: Timestamp.fromDate(slaDeadline),
        slaBreached,
        slaBreachedAt: slaBreached ? now : null,
        hoursUnprocessed,
        daysUnprocessed,
        lastEscalationCheck: now,
      };

      await updateDoc(complaintRef, escalationData as any);

      console.log(`✅ Auto-escalated complaint ${complaintId} to level ${newLevel}`);
    } catch (error) {
      console.error('Error auto-escalating complaint:', error);
      throw error;
    }
  }

  /**
   * Manually escalate a complaint
   */
  static async manualEscalate(
    complaintId: string,
    newLevel: EscalationLevel,
    reason: string,
    notes: string,
    escalatedBy: string,
    escalatedByName: string,
    reportedAt: Date,
    category: string,
    currentEscalationData?: Partial<EscalationData>
  ): Promise<void> {
    try {
      const now = Timestamp.now();
      const hoursUnprocessed = calculateHoursUnprocessed(reportedAt);
      const daysUnprocessed = calculateDaysUnprocessed(reportedAt);

      // Calculate SLA
      const slaDeadline = calculateSLADeadline(reportedAt, category);
      const slaBreached = isSLABreached(reportedAt, category);

      // Create escalation history entry
      const historyEntry: EscalationHistoryEntry = {
        level: newLevel,
        previousLevel: currentEscalationData?.escalationLevel || 0,
        escalatedAt: now,
        escalatedBy,
        escalatedByName,
        reason,
        notes,
        autoEscalated: false,
      };

      // Update complaint
      const complaintRef = doc(db, this.COMPLAINTS_COLLECTION, complaintId);
      const escalationData: Partial<EscalationData> = {
        escalationLevel: newLevel,
        isEscalated: newLevel > 0,
        escalatedAt: now,
        autoEscalated: false,
        escalationReason: reason,
        escalationNotes: notes,
        escalationHistory: [
          ...(currentEscalationData?.escalationHistory || []),
          historyEntry,
        ],
        slaDeadline: Timestamp.fromDate(slaDeadline),
        slaBreached,
        slaBreachedAt: slaBreached ? now : null,
        hoursUnprocessed,
        daysUnprocessed,
        lastEscalationCheck: now,
      };

      await updateDoc(complaintRef, escalationData as any);

      console.log(`✅ Manually escalated complaint ${complaintId} to level ${newLevel}`);
    } catch (error) {
      console.error('Error manually escalating complaint:', error);
      throw error;
    }
  }

  /**
   * De-escalate a complaint (manual only)
   */
  static async deEscalate(
    complaintId: string,
    newLevel: EscalationLevel,
    reason: string,
    notes: string,
    deEscalatedBy: string,
    deEscalatedByName: string,
    currentEscalationData?: Partial<EscalationData>
  ): Promise<void> {
    try {
      const now = Timestamp.now();

      // Create history entry
      const historyEntry: EscalationHistoryEntry = {
        level: newLevel,
        previousLevel: currentEscalationData?.escalationLevel || 0,
        escalatedAt: now,
        escalatedBy: deEscalatedBy,
        escalatedByName: deEscalatedByName,
        reason: `De-escalated: ${reason}`,
        notes,
        autoEscalated: false,
      };

      // Update complaint
      const complaintRef = doc(db, this.COMPLAINTS_COLLECTION, complaintId);
      await updateDoc(complaintRef, {
        escalationLevel: newLevel,
        isEscalated: newLevel > 0,
        escalatedAt: now,
        autoEscalated: false,
        escalationReason: reason,
        escalationNotes: notes,
        escalationHistory: [
          ...(currentEscalationData?.escalationHistory || []),
          historyEntry,
        ],
        lastEscalationCheck: now,
      } as any);

      console.log(`✅ De-escalated complaint ${complaintId} to level ${newLevel}`);
    } catch (error) {
      console.error('Error de-escalating complaint:', error);
      throw error;
    }
  }

  /**
   * Monitor and auto-escalate all pending/in-progress complaints
   */
  static async monitorAndEscalate(): Promise<{
    checked: number;
    escalated: number;
    errors: number;
  }> {
    try {
      console.log('🔍 Starting escalation monitor...');

      // Get all pending and in-progress complaints
      const complaintsRef = collection(db, this.COMPLAINTS_COLLECTION);
      const q = query(
        complaintsRef,
        where('status', 'in', ['pending', 'inProgress'])
      );

      const snapshot = await getDocs(q);
      console.log(`📊 Found ${snapshot.size} active complaints to check`);

      let checked = 0;
      let escalated = 0;
      let errors = 0;

      // Use batch for better performance
      const batch = writeBatch(db);
      const updates: Array<{ id: string; data: any }> = [];

      for (const docSnap of snapshot.docs) {
        try {
          checked++;
          const data = docSnap.data();
          const reportedAt = data.reportedAt?.toDate?.() || new Date(data.reportedAt);
          const currentLevel = data.escalationLevel || 0;
          const category = data.category || 'other';

          // Check if escalation is needed
          const result = await this.checkAndEscalate(
            docSnap.id,
            reportedAt,
            data.status,
            category,
            currentLevel
          );

          if (result.shouldEscalate) {
            // Prepare escalation data
            const now = Timestamp.now();
            const hoursUnprocessed = result.hoursUnprocessed;
            const daysUnprocessed = calculateDaysUnprocessed(reportedAt);
            const slaDeadline = calculateSLADeadline(reportedAt, category);
            const slaBreached = isSLABreached(reportedAt, category);

            const historyEntry: EscalationHistoryEntry = {
              level: result.newLevel,
              previousLevel: currentLevel,
              escalatedAt: now,
              escalatedBy: 'SYSTEM',
              escalatedByName: 'Auto-Escalation Monitor',
              reason: `Auto-escalated after ${hoursUnprocessed} hours unprocessed`,
              autoEscalated: true,
            };

            const escalationData = {
              escalationLevel: result.newLevel,
              isEscalated: true,
              escalatedAt: now,
              autoEscalated: true,
              escalationReason: historyEntry.reason,
              escalationHistory: [
                ...(data.escalationHistory || []),
                historyEntry,
              ],
              slaDeadline: Timestamp.fromDate(slaDeadline),
              slaBreached,
              slaBreachedAt: slaBreached ? now : null,
              hoursUnprocessed,
              daysUnprocessed,
              lastEscalationCheck: now,
            };

            updates.push({ id: docSnap.id, data: escalationData });
            escalated++;

            // Add to batch (max 500 operations per batch)
            if (updates.length < 500) {
              const ref = doc(db, this.COMPLAINTS_COLLECTION, docSnap.id);
              batch.update(ref, escalationData as any);
            }
          } else {
            // Update check timestamp only
            const ref = doc(db, this.COMPLAINTS_COLLECTION, docSnap.id);
            batch.update(ref, { lastEscalationCheck: Timestamp.now() });
          }
        } catch (error) {
          console.error(`Error processing complaint ${docSnap.id}:`, error);
          errors++;
        }
      }

      // Commit batch
      if (updates.length > 0 && updates.length <= 500) {
        await batch.commit();
        console.log('✅ Batch update committed');
      }

      console.log(`✅ Escalation monitor complete:`, {
        checked,
        escalated,
        errors,
      });

      return { checked, escalated, errors };
    } catch (error) {
      console.error('Error in escalation monitor:', error);
      throw error;
    }
  }

  /**
   * Get escalation statistics
   */
  static async getEscalationStats(): Promise<{
    total: number;
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    slaBreached: number;
    autoEscalated: number;
  }> {
    try {
      const complaintsRef = collection(db, this.COMPLAINTS_COLLECTION);
      const snapshot = await getDocs(complaintsRef);

      const stats = {
        total: snapshot.size,
        level0: 0,
        level1: 0,
        level2: 0,
        level3: 0,
        slaBreached: 0,
        autoEscalated: 0,
      };

      snapshot.forEach((doc) => {
        const data = doc.data();
        const level = data.escalationLevel || 0;

        if (level === 0) stats.level0++;
        if (level === 1) stats.level1++;
        if (level === 2) stats.level2++;
        if (level === 3) stats.level3++;

        if (data.slaBreached) stats.slaBreached++;
        if (data.autoEscalated) stats.autoEscalated++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting escalation stats:', error);
      throw error;
    }
  }

  /**
   * Get complaints by escalation level
   */
  static async getByEscalationLevel(level: EscalationLevel): Promise<any[]> {
    try {
      const complaintsRef = collection(db, this.COMPLAINTS_COLLECTION);
      const q = query(complaintsRef, where('escalationLevel', '==', level));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting complaints by escalation level:', error);
      throw error;
    }
  }
}
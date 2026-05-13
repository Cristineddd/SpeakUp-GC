/**
 * Case Notes Service
 * Manages internal notes/comments for cases (Admin & Handler only)
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CaseNote, CreateCaseNoteData } from '../types/caseNote';
import { NotificationService } from './notificationService';

export class CaseNoteService {
  private static readonly COLLECTION = 'caseNotes';

  /**
   * Create a new case note
   */
  static async createNote(data: CreateCaseNoteData): Promise<string> {
    try {
      console.log('📝 Creating case note:', data.caseId);

      const now = Timestamp.now();
      const noteData = {
        ...data,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), noteData);
      console.log(`✅ Case note created: ${docRef.id}`);

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating case note:', error);
      throw error;
    }
  }

  /**
   * Get all notes for a specific case
   */
  static async getNotesByCaseId(caseId: string): Promise<CaseNote[]> {
    try {
      console.log(`🔍 Fetching notes for case: ${caseId}`);

      const q = query(
        collection(db, this.COLLECTION),
        where('caseId', '==', caseId),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const notes: CaseNote[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          caseId: data.caseId,
          userId: data.userId,
          userName: data.userName,
          userRole: data.userRole,
          userEmail: data.userEmail,
          message: data.message,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt
        } as CaseNote;
      });

      console.log(`✅ Found ${notes.length} notes for case ${caseId}`);
      return notes;
    } catch (error) {
      console.error(`❌ Error fetching notes for case ${caseId}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for case notes
   */
  static subscribeToNotes(
    caseId: string,
    callback: (notes: CaseNote[]) => void
  ): Unsubscribe {
    console.log(`🔔 Subscribing to notes for case: ${caseId}`);

    const q = query(
      collection(db, this.COLLECTION),
      where('caseId', '==', caseId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const notes: CaseNote[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          caseId: data.caseId,
          userId: data.userId,
          userName: data.userName,
          userRole: data.userRole,
          userEmail: data.userEmail,
          message: data.message,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt
        } as CaseNote;
      });

      callback(notes);
    });
  }

  /**
   * Create note and send notification to other party
   */
  static async createNoteWithNotification(
    noteData: CreateCaseNoteData,
    caseTitle: string,
    recipientId: string,
    recipientRole: 'admin' | 'handler'
  ): Promise<string> {
    try {
      // Create the note
      const noteId = await this.createNote(noteData);

      // Send notification to the other party
      try {
        await NotificationService.sendCaseNoteNotification(
          recipientId,
          noteData.caseId,
          caseTitle,
          noteData.userName,
          noteData.userRole,
          noteData.message
        );
        console.log(`✅ Notification sent to ${recipientRole}`);
      } catch (notifError) {
        console.warn('⚠️ Failed to send notification (non-critical):', notifError);
      }

      return noteId;
    } catch (error) {
      console.error('❌ Error creating note with notification:', error);
      throw error;
    }
  }
}

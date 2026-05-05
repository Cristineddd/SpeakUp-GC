/**
 * Firebase Function: updateReportStatus
 * 
 * Enforces strict step-by-step status transitions for reports/complaints
 * Prevents jumping between statuses (e.g., pending → resolved)
 * 
 * Valid Flow:
 * pending → inProgress → resolved/dismissed
 * 
 * Once resolved/dismissed, status becomes final (no more changes)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Define valid status values for reports
type ReportStatus = 'pending' | 'submitted' | 'inProgress' | 'resolved' | 'dismissed';

// Define valid transitions (current status → allowed next statuses)
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ['inProgress'],
  submitted: ['inProgress'], // Treat 'submitted' same as 'pending'
  inProgress: ['resolved', 'dismissed'],
  resolved: [], // Final state - no transitions allowed
  dismissed: [] // Final state - no transitions allowed
};

// Map status to case tracking stage
const STATUS_TO_STAGE_MAP: Record<ReportStatus, string> = {
  pending: 'filing',
  submitted: 'filing', // Treat 'submitted' same as 'pending'
  inProgress: 'preliminary_investigation',
  resolved: 'final_decision',
  dismissed: 'closed'
};

interface UpdateReportStatusRequest {
  reportId: string;
  newStatus: ReportStatus;
  updatedBy: string; // User ID of person making the change
  updatedByName: string; // Name of person making the change
  notes?: string; // Optional notes for the transition
  collectionName?: 'reports' | 'complaints'; // Which collection to update
}

interface StatusHistoryEntry {
  status: ReportStatus;
  stage: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: admin.firestore.Timestamp;
  notes?: string;
}

/**
 * Validates if a status transition is allowed
 */
function isValidTransition(currentStatus: ReportStatus, newStatus: ReportStatus): boolean {
  const allowedStatuses = VALID_TRANSITIONS[currentStatus];
  return allowedStatuses.includes(newStatus);
}

/**
 * HTTP Callable Function - Update Report Status with Validation
 */
export const updateReportStatus = functions.https.onCall(
  async (request) => {
    try {
      const data = request.data as UpdateReportStatusRequest;
      const context = request.auth;

      // ============================================
      // 1. AUTHENTICATION CHECK
      // ============================================
      if (!context) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to update report status'
        );
      }

      // ============================================
      // 2. INPUT VALIDATION
      // ============================================
      const { reportId, newStatus, updatedBy, updatedByName, notes, collectionName } = data;

      if (!reportId || typeof reportId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Report ID is required and must be a string'
        );
      }

      if (!newStatus || typeof newStatus !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'New status is required and must be a string'
        );
      }

      if (!updatedBy || typeof updatedBy !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'updatedBy (user ID) is required'
        );
      }

      if (!updatedByName || typeof updatedByName !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'updatedByName is required'
        );
      }

      // Validate status value
      const validStatuses: ReportStatus[] = ['pending', 'inProgress', 'resolved', 'dismissed'];
      if (!validStatuses.includes(newStatus as ReportStatus)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }

      // Default to 'reports' collection if not specified
      const collection = collectionName || 'reports';

      // ============================================
      // 3. FETCH CURRENT REPORT DATA
      // ============================================
      const reportRef = db.collection(collection).doc(reportId);
      const reportDoc = await reportRef.get();

      if (!reportDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Report ${reportId} not found in ${collection} collection`
        );
      }

      const reportData = reportDoc.data();
      const currentStatus = reportData?.status as ReportStatus;

      if (!currentStatus) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Report has no current status'
        );
      }

      // ============================================
      // 4. VALIDATE STATUS TRANSITION
      // ============================================
      
      // Check if trying to change same status
      if (currentStatus === newStatus) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Report is already in ${newStatus} status`
        );
      }

      // Check if transition is valid
      if (!isValidTransition(currentStatus, newStatus)) {
        const allowedStatuses = VALID_TRANSITIONS[currentStatus];
        
        if (allowedStatuses.length === 0) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Cannot change status from ${currentStatus}. This is a final state.`
          );
        }

        throw new functions.https.HttpsError(
          'failed-precondition',
          `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowedStatuses.join(', ')}. ` +
          `Please follow the step-by-step process.`
        );
      }

      // ============================================
      // 5. PREPARE STATUS HISTORY ENTRY
      // ============================================
      const historyEntry: StatusHistoryEntry = {
        status: newStatus,
        stage: STATUS_TO_STAGE_MAP[newStatus],
        updatedBy,
        updatedByName,
        updatedAt: admin.firestore.Timestamp.now(),
        ...(notes && { notes })
      };

      // ============================================
      // 6. UPDATE REPORT IN FIRESTORE
      // ============================================
      await reportRef.update({
        status: newStatus,
        stage: STATUS_TO_STAGE_MAP[newStatus],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      });

      // ============================================
      // 7. LOG SUCCESS
      // ============================================
      console.log(`✅ Status transition successful for report ${reportId}:`, {
        from: currentStatus,
        to: newStatus,
        by: updatedByName,
        collection
      });

      // ============================================
      // 8. RETURN SUCCESS RESPONSE
      // ============================================
      return {
        success: true,
        message: `Report status updated from ${currentStatus} to ${newStatus}`,
        reportId,
        previousStatus: currentStatus,
        newStatus,
        stage: STATUS_TO_STAGE_MAP[newStatus],
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // Re-throw HttpsErrors
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Log unexpected errors
      console.error('Error in updateReportStatus:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred while updating report status',
        error.message
      );
    }
  }
);

/**
 * Helper function to get allowed next statuses (for frontend)
 */
export const getAllowedReportStatuses = functions.https.onCall(
  async (request) => {
    const data = request.data as { currentStatus: ReportStatus };
    const context = request.auth;

    if (!context) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { currentStatus } = data;

    if (!currentStatus) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Current status is required'
      );
    }

    return {
      currentStatus,
      allowedNextStatuses: VALID_TRANSITIONS[currentStatus] || []
    };
  }
);

/**
 * Firebase Function: updateComplaintStatus
 * 
 * Enforces strict step-by-step status transitions for complaints
 * 
 * Valid Flow:
 * pending → assigned → ongoing → resolved/dismissed
 * 
 * Once resolved/dismissed, status becomes final (no more changes)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Define valid status values
type ComplaintStatus = 'pending' | 'assigned' | 'ongoing' | 'resolved' | 'dismissed';

// Define valid transitions (current status → allowed next statuses)
const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  pending: ['assigned'],
  assigned: ['ongoing'],
  ongoing: ['resolved', 'dismissed'],
  resolved: [], // Final state - no transitions allowed
  dismissed: [] // Final state - no transitions allowed
};

interface UpdateStatusRequest {
  complaintId: string;
  newStatus: ComplaintStatus;
  updatedBy: string; // User ID of person making the change
  updatedByName: string; // Name of person making the change
  notes?: string; // Optional notes for the transition
  assignedTo?: string; // Required when transitioning to 'assigned'
  assignedToName?: string; // Name of assigned handler
}

interface StatusHistoryEntry {
  status: ComplaintStatus;
  updatedBy: string;
  updatedByName: string;
  updatedAt: admin.firestore.Timestamp;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
}

/**
 * Validates if a status transition is allowed
 */
function isValidTransition(currentStatus: ComplaintStatus, newStatus: ComplaintStatus): boolean {
  const allowedStatuses = VALID_TRANSITIONS[currentStatus];
  return allowedStatuses.includes(newStatus);
}

/**
 * HTTP Callable Function - Update Complaint Status
 */
export const updateComplaintStatus = functions.https.onCall(
  async (request) => {
    try {
      const data = request.data as UpdateStatusRequest;
      const context = request.auth;

      // ============================================
      // 1. AUTHENTICATION CHECK
      // ============================================
      if (!context) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to update complaint status'
        );
      }

      // ============================================
      // 2. INPUT VALIDATION
      // ============================================
      const { complaintId, newStatus, updatedBy, updatedByName, notes, assignedTo, assignedToName } = data;

      if (!complaintId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Complaint ID is required'
        );
      }

      if (!newStatus) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'New status is required'
        );
      }

      if (!updatedBy || !updatedByName) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Updated by information is required'
        );
      }

      // Validate status value
      const validStatuses: ComplaintStatus[] = ['pending', 'assigned', 'ongoing', 'resolved', 'dismissed'];
      if (!validStatuses.includes(newStatus)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid status value: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`
        );
      }

      // Special validation: 'assigned' status requires assignedTo
      if (newStatus === 'assigned' && !assignedTo) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'AssignedTo field is required when transitioning to "assigned" status'
        );
      }

      // ============================================
      // 3. FETCH CURRENT COMPLAINT
      // ============================================
      const complaintRef = db.collection('complaints').doc(complaintId);
      const complaintSnap = await complaintRef.get();

      if (!complaintSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Complaint with ID ${complaintId} not found`
        );
      }

      const complaintData = complaintSnap.data();
      const currentStatus = complaintData?.status as ComplaintStatus;

      if (!currentStatus) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Complaint has no status field'
        );
      }

      // ============================================
      // 4. CHECK IF ALREADY AT DESIRED STATUS
      // ============================================
      if (currentStatus === newStatus) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Complaint is already in "${newStatus}" status`
        );
      }

      // ============================================
      // 5. VALIDATE TRANSITION RULES
      // ============================================
      if (!isValidTransition(currentStatus, newStatus)) {
        const allowedStatuses = VALID_TRANSITIONS[currentStatus];
        
        // Generate helpful error message
        let errorMessage = '';
        if (allowedStatuses.length === 0) {
          errorMessage = `Cannot change status from "${currentStatus}". This is a final state.`;
        } else {
          errorMessage = `Invalid status transition from "${currentStatus}" to "${newStatus}". ` +
            `Allowed transitions: ${currentStatus} → ${allowedStatuses.join(' or ')}`;
        }

        throw new functions.https.HttpsError(
          'failed-precondition',
          errorMessage
        );
      }

      // ============================================
      // 6. PREPARE STATUS HISTORY ENTRY
      // ============================================
      const historyEntry: StatusHistoryEntry = {
        status: newStatus,
        updatedBy,
        updatedByName,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (notes) {
        historyEntry.notes = notes;
      }

      if (assignedTo && assignedToName) {
        historyEntry.assignedTo = assignedTo;
        historyEntry.assignedToName = assignedToName;
      }

      // ============================================
      // 7. UPDATE COMPLAINT IN FIRESTORE
      // ============================================
      const updateData: any = {
        status: newStatus,
        updatedAt: admin.firestore.Timestamp.now(),
        lastUpdatedBy: updatedBy,
        lastUpdatedByName: updatedByName,
        statusHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
      };

      // Add assignedTo fields if transitioning to 'assigned'
      if (newStatus === 'assigned' && assignedTo) {
        updateData.assignedTo = assignedTo;
        updateData.assignedToName = assignedToName;
        updateData.assignedAt = admin.firestore.Timestamp.now();
      }

      // Add resolution/dismissal timestamp if final state
      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        updateData.closedAt = admin.firestore.Timestamp.now();
        updateData.closedBy = updatedBy;
        updateData.closedByName = updatedByName;
      }

      await complaintRef.update(updateData);

      // ============================================
      // 8. SEND IN-APP NOTIFICATIONS
      // ============================================
      try {
        const complainantId: string = complaintData?.userId || complaintData?.complainantId || '';
        const respondentId: string = complaintData?.respondentId || '';
        const complaintTitle: string = complaintData?.title || 'Formal Complaint';

        // Notify complainant of status changes
        if (complainantId) {
          const notifRef = admin.firestore().collection('notifications');
          const baseNotif = {
            userId: complainantId,
            complaintId,
            complaintTitle,
            status: 'unread',
            createdAt: admin.firestore.Timestamp.now(),
            actionUrl: `/case-tracking/${complaintId}`,
            actionLabel: 'View Case',
          };

          if (newStatus === 'assigned') {
            await notifRef.add({
              ...baseNotif,
              type: 'complaint_assigned',
              priority: 'high',
              title: 'Case Taken',
              message: `Your complaint "${complaintTitle}" has been taken by ${assignedToName || 'a CODI member'} for review.`,
            });
          } else if (newStatus === 'ongoing') {
            await notifRef.add({
              ...baseNotif,
              type: 'status_update',
              priority: 'high',
              title: 'Complaint Now Under Active Review',
              message: `Your complaint "${complaintTitle}" is now under active review by the DEIU office.${notes ? ` Notes: ${notes}` : ''}`,
            });
          } else if (newStatus === 'resolved') {
            await notifRef.add({
              ...baseNotif,
              type: 'decision_issued',
              priority: 'urgent',
              title: 'Complaint Decision: Upheld / Resolved',
              message: `The DEIU office has issued a final decision on "${complaintTitle}": Upheld / Resolved.${notes ? ` Summary: ${notes}` : ''} Please contact the DEIU office for the full written decision. You may file a motion for reconsideration within the allowed period.`,
            });
            // Notify respondent of decision too
            if (respondentId) {
              await notifRef.add({
                ...baseNotif,
                userId: respondentId,
                type: 'decision_issued',
                priority: 'urgent',
                title: 'Complaint Decision: Upheld / Resolved',
                message: `The DEIU office has issued a final decision on complaint "${complaintTitle}": Upheld / Resolved. As the respondent, you may file a motion for reconsideration within the allowed period. Please contact the DEIU office for the full written decision.`,
              });
            }
          } else if (newStatus === 'dismissed') {
            await notifRef.add({
              ...baseNotif,
              type: 'decision_issued',
              priority: 'urgent',
              title: 'Complaint Decision: Dismissed',
              message: `The DEIU office has issued a final decision on "${complaintTitle}": Dismissed.${notes ? ` Reason: ${notes}` : ''} Please contact the DEIU office for the full written decision.`,
            });
            // Notify respondent of decision too
            if (respondentId) {
              await notifRef.add({
                ...baseNotif,
                userId: respondentId,
                type: 'decision_issued',
                priority: 'urgent',
                title: 'Complaint Decision: Dismissed',
                message: `The DEIU office has issued a final decision on complaint "${complaintTitle}": Dismissed. As the respondent, please contact the DEIU office for the full written decision.`,
              });
            }
          }
        }
      } catch (notifyError: any) {
        console.warn('⚠️ Could not send status change notification:', notifyError?.message);
        // Do not throw — notification failure should not block the status update
      }

      // ============================================
      // 9. RETURN SUCCESS RESPONSE
      // ============================================
      return {
        success: true,
        message: `Complaint status updated from "${currentStatus}" to "${newStatus}"`,
        complaintId,
        previousStatus: currentStatus,
        newStatus,
        timestamp: admin.firestore.Timestamp.now().toDate().toISOString()
      };

    } catch (error: any) {
      // Re-throw HttpsError instances
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Handle unexpected errors
      console.error('Error in updateComplaintStatus:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred while updating complaint status',
        error.message
      );
    }
  }
);

/**
 * Helper function to get allowed next statuses (for frontend)
 */
export const getAllowedNextStatuses = functions.https.onCall(
  async (request) => {
    const data = request.data as { currentStatus: ComplaintStatus };
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

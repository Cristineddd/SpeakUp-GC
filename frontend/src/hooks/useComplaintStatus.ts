import { useState } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { NotificationService } from '../services/notificationService';

export type ComplaintStatus = 'pending' | 'assigned' | 'ongoing' | 'resolved' | 'dismissed';

interface StatusTransitionData {
  complaintId: string;
  newStatus: ComplaintStatus;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  updatedBy?: string;
  updatedByName?: string;
}

interface StatusTransitionResult {
  success: boolean;
  message: string;
  complaintId: string;
  previousStatus: ComplaintStatus;
  newStatus: ComplaintStatus;
  timestamp: string;
}

// Define valid transitions
const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  pending: ['assigned'],
  assigned: ['ongoing'],
  ongoing: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
};

// Status labels for UI
export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: 'Submitted',
  assigned: 'Submitted',
  ongoing: 'Ongoing Investigation',
  resolved: 'Decision Already Made',
  dismissed: 'Decision Already Made',
};

// Status colors for badges
export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  ongoing: 'bg-purple-100 text-purple-800 border-purple-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  dismissed: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Map complaint statuses to NotificationService status types
const NOTIFICATION_STATUS_MAP: Record<ComplaintStatus, 'pending' | 'inProgress' | 'resolved' | 'dismissed'> = {
  pending: 'pending',
  assigned: 'pending',
  ongoing: 'inProgress',
  resolved: 'resolved',
  dismissed: 'dismissed',
};

export function useComplaintStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  /**
   * Get allowed next statuses for a given current status
   */
  const getAllowedNextStatuses = (currentStatus: ComplaintStatus): ComplaintStatus[] => {
    return VALID_TRANSITIONS[currentStatus] || [];
  };

  /**
   * Check if a transition is valid
   */
  const isValidTransition = (
    currentStatus: ComplaintStatus,
    newStatus: ComplaintStatus
  ): boolean => {
    return VALID_TRANSITIONS[currentStatus].includes(newStatus);
  };

  /**
   * Check if status is final (no more transitions allowed)
   */
  const isFinalStatus = (status: ComplaintStatus): boolean => {
    return status === 'resolved' || status === 'dismissed';
  };

  /**
   * Update complaint status directly via Firestore + send notification
   */
  const updateStatus = async (
    data: StatusTransitionData
  ): Promise<StatusTransitionResult | null> => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to update complaint status',
        variant: 'destructive',
      });
      return null;
    }

    // Require notes for status changes (except for initial submission)
    if (data.newStatus !== 'pending' && data.newStatus !== 'assigned' && !data.notes?.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please provide a description for this status change before submitting.',
        variant: 'destructive',
      });
      return null;
    }

    // Validate minimum length for notes
    if (data.notes && data.notes.trim().length < 10) {
      toast({
        title: 'Description Too Short',
        description: 'Please provide at least 10 characters for the status change description.',
        variant: 'destructive',
      });
      return null;
    }

    setIsUpdating(true);

    try {
      const { complaintId, newStatus, notes, assignedTo, assignedToName } = data;

      // ── 1. Fetch complaint doc (try 'complaints' first, fallback to 'reports') ──
      let docRef = doc(db, 'complaints', complaintId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        docRef = doc(db, 'reports', complaintId);
        docSnap = await getDoc(docRef);
      }

      if (!docSnap.exists()) {
        throw new Error('Complaint not found in complaints or reports collection');
      }

      const complaintData = docSnap.data();
      const previousStatus = complaintData.status as ComplaintStatus;
      const complaintTitle =
        complaintData.title || complaintData.description || 'Your complaint';
      const complainantId = complaintData.complainantId || complaintData.userId;

      // ── 2. Update Firestore ──
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        ...(notes && { notes }),
        ...(assignedTo && { assignedTo, handlerId: assignedTo }),
        ...(assignedToName && { assignedToName }),
        statusHistory: arrayUnion({
          status: newStatus,
          updatedBy: currentUser.uid,
          updatedByName:
            currentUser.displayName || currentUser.email || 'Unknown',
          updatedAt: new Date().toISOString(),
          ...(notes && { notes }),
        }),
      });

      // ── 3. Send notification to complainant (non-blocking) ──
      if (complainantId) {
        const mappedStatus = NOTIFICATION_STATUS_MAP[newStatus];
        try {
          await NotificationService.sendComplaintStatusNotification(
            complainantId,
            complaintId,
            complaintTitle,
            mappedStatus,
            notes
          );
          console.log(
            `🔔 Notification sent to ${complainantId} for status: ${newStatus}`
          );
        } catch (notifErr) {
          // Non-blocking — status update still succeeds even if notif fails
          console.error('⚠️ Notification failed (non-critical):', notifErr);
        }
      }

      toast({
        title: 'Status Updated',
        description: `Status changed to ${STATUS_LABELS[newStatus]}`,
      });

      return {
        success: true,
        message: `Status updated to ${STATUS_LABELS[newStatus]}`,
        complaintId,
        previousStatus,
        newStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Error updating complaint status:', error);

      let errorMessage = 'Failed to update complaint status';
      if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to update this complaint';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Get transition button config for UI
   */
  const getTransitionButtons = (currentStatus: ComplaintStatus) => {
    const allowedStatuses = getAllowedNextStatuses(currentStatus);
    return allowedStatuses.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
      requiresAssignment: status === 'assigned',
      isDestructive: status === 'dismissed',
    }));
  };

  return {
    // State
    isUpdating,

    // Methods
    updateStatus,
    getAllowedNextStatuses,
    isValidTransition,
    isFinalStatus,
    getTransitionButtons,

    // Constants
    STATUS_LABELS,
    STATUS_COLORS,
  };
}
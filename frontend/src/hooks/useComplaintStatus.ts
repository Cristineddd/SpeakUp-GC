import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';

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

// Define valid transitions (must match Firebase Function)
const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  pending: ['assigned'],
  assigned: ['ongoing'],
  ongoing: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: []
};

// Status labels for UI
export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  ongoing: 'Ongoing',
  resolved: 'Resolved',
  dismissed: 'Dismissed'
};

// Status colors for badges
export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  ongoing: 'bg-purple-100 text-purple-800 border-purple-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  dismissed: 'bg-gray-100 text-gray-800 border-gray-200'
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
  const isValidTransition = (currentStatus: ComplaintStatus, newStatus: ComplaintStatus): boolean => {
    const allowedStatuses = VALID_TRANSITIONS[currentStatus];
    return allowedStatuses.includes(newStatus);
  };

  /**
   * Check if status is final (no more transitions allowed)
   */
  const isFinalStatus = (status: ComplaintStatus): boolean => {
    return status === 'resolved' || status === 'dismissed';
  };

  /**
   * Update complaint status with server-side validation
   */
  const updateStatus = async (data: StatusTransitionData): Promise<StatusTransitionResult | null> => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to update complaint status',
        variant: 'destructive'
      });
      return null;
    }

    setIsUpdating(true);

    try {
      // Call Firebase Function
      const functions = getFunctions();
      const updateComplaintStatusFn = httpsCallable<StatusTransitionData, StatusTransitionResult>(
        functions,
        'updateComplaintStatus'
      );

      const result = await updateComplaintStatusFn({
        ...data,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName || currentUser.email || 'Unknown User'
      });

      if (result.data.success) {
        toast({
          title: 'Status Updated',
          description: result.data.message,
          variant: 'default'
        });

        return result.data;
      }

      return null;

    } catch (error: any) {
      console.error('Error updating complaint status:', error);

      // Handle specific error codes
      let errorMessage = 'Failed to update complaint status';

      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in to perform this action';
      } else if (error.code === 'failed-precondition') {
        errorMessage = error.message || 'Invalid status transition';
      } else if (error.code === 'invalid-argument') {
        errorMessage = error.message || 'Invalid input provided';
      } else if (error.code === 'not-found') {
        errorMessage = 'Complaint not found';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive'
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

    return allowedStatuses.map(status => ({
      status,
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
      requiresAssignment: status === 'assigned',
      isDestructive: status === 'dismissed'
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
    STATUS_COLORS
  };
}

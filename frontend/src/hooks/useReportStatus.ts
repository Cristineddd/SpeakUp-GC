/**
 * React Hook: useReportStatus
 * 
 * Manages report status transitions with strict validation
 * Integrates with Firebase Function for server-side enforcement
 * 
 * Usage:
 * const { updateStatus, getTransitionButtons } = useReportStatus(reportId, currentStatus);
 */

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ReportStatus = 'pending' | 'submitted' | 'inProgress' | 'resolved' | 'dismissed';

// Define valid transitions - must match backend
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ['inProgress'],
  submitted: ['inProgress'], // Treat 'submitted' same as 'pending'
  inProgress: ['resolved', 'dismissed'],
  resolved: [], // Final status - cannot be changed
  dismissed: [] // Final status - cannot be changed
};

interface UpdateStatusData {
  reportId: string;
  newStatus: ReportStatus;
  updatedBy: string;
  updatedByName: string;
  notes?: string;
  collectionName?: 'reports' | 'complaints';
}

interface StatusTransitionResult {
  success: boolean;
  message: string;
  reportId: string;
  previousStatus: ReportStatus;
  newStatus: ReportStatus;
  stage: string;
  timestamp: string;
}

export function useReportStatus(
  reportId: string,
  currentStatus: ReportStatus,
  collectionName: 'reports' | 'complaints' = 'reports',
  onStatusUpdated?: () => void
) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const functions = getFunctions();

  /**
   * Get allowed next statuses for current status
   */
  const getAllowedNextStatuses = (): ReportStatus[] => {
    return VALID_TRANSITIONS[currentStatus] || [];
  };

  /**
   * Check if a specific transition is allowed
   */
  const canTransitionTo = (newStatus: ReportStatus): boolean => {
    return getAllowedNextStatuses().includes(newStatus);
  };

  /**
   * Update report status with CLIENT-SIDE validation (No Cloud Functions needed)
   */
  const updateStatus = async (
    newStatus: ReportStatus,
    notes?: string
  ): Promise<boolean> => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to update report status',
        variant: 'destructive',
      });
      return false;
    }

    if (!canTransitionTo(newStatus)) {
      const allowed = getAllowedNextStatuses();
      toast({
        title: 'Invalid Status Transition',
        description: allowed.length > 0
          ? `Can only transition to: ${allowed.join(', ')}`
          : 'This report status cannot be changed (final state)',
        variant: 'destructive',
      });
      return false;
    }

    setIsUpdating(true);

    try {
      // CLIENT-SIDE: Direct Firestore update (no Cloud Functions)
      const { getFirestore, doc, updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
      const db = getFirestore();
      
      const reportRef = doc(db, collectionName, reportId);
      
      const statusUpdate = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName || currentUser.email || 'Unknown User',
        statusHistory: arrayUnion({
          status: newStatus,
          previousStatus: currentStatus,
          updatedAt: new Date(),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName || currentUser.email || 'Unknown User',
          notes: notes || null
        })
      };

      await updateDoc(reportRef, statusUpdate);

      // Send notification to complainant about status change
      try {
        const { getDoc } = await import('firebase/firestore');
        const reportSnapshot = await getDoc(reportRef);
        
        if (reportSnapshot.exists()) {
          const reportData = reportSnapshot.data();
          const complainantId = reportData.userId;
          
          if (complainantId) {
            const { NotificationService } = await import('../services/notificationService');
            
            // Send different notifications based on status
            if (newStatus === 'inProgress') {
              await NotificationService.sendComplaintInProgressNotification(
                complainantId,
                reportId,
                reportData.title || 'Your complaint',
                'Your complaint is now being reviewed and processed by our team.'
              );
            } else if (newStatus === 'resolved') {
              await NotificationService.sendComplaintResolvedNotification(
                complainantId,
                reportId,
                reportData.title || 'Your complaint',
                'Your complaint has been resolved. Please check the resolution details.'
              );
            } else if (newStatus === 'dismissed') {
              await NotificationService.sendComplaintDismissedNotification(
                complainantId,
                reportId,
                reportData.title || 'Your complaint',
                'Your complaint has been reviewed and dismissed. Please check the details for more information.'
              );
            }
          }
        }
      } catch (notifError) {
        console.error('Failed to send status update notification:', notifError);
        // Don't fail the status update if notification fails
      }

      toast({
        title: 'Status Updated',
        description: `Report status changed to ${getStatusLabel(newStatus)}`,
      });

      // Trigger callback to refresh data
      if (onStatusUpdated) {
        onStatusUpdated();
      }

      return true;
    } catch (error: any) {
      console.error('Error updating report status:', error);
      
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update report status',
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Get status label with proper formatting
   */
  const getStatusLabel = (status: ReportStatus): string => {
    const labels: Record<ReportStatus, string> = {
      pending: 'Pending',
      submitted: 'Submitted',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed'
    };
    return labels[status];
  };

  /**
   * Get status color class for badges
   */
  const getStatusColor = (status: ReportStatus): string => {
    const colors: Record<ReportStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      inProgress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  /**
   * Get transition buttons configuration
   * Returns array of button configs for UI rendering
   */
  const getTransitionButtons = () => {
    const allowedStatuses = getAllowedNextStatuses();
    
    return allowedStatuses.map(status => ({
      status,
      label: getStatusLabel(status),
      color: getStatusColor(status),
      onClick: () => updateStatus(status),
      disabled: isUpdating
    }));
  };

  /**
   * Check if status is final (no more transitions)
   */
  const isFinalStatus = (): boolean => {
    return getAllowedNextStatuses().length === 0;
  };

  return {
    // State
    isUpdating,
    currentStatus,
    
    // Status checking
    canTransitionTo,
    getAllowedNextStatuses,
    isFinalStatus,
    
    // Actions
    updateStatus,
    
    // UI helpers
    getStatusLabel,
    getStatusColor,
    getTransitionButtons
  };
}

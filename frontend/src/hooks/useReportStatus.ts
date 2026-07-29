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
import { CaseActivityService } from '../services/caseActivityService';
import { toActivityActorRole } from '../types/caseActivity';
import { RepresentativeService } from '../services/representativeService';

export type ReportStatus = 'pending' | 'submitted' | 'inProgress' | 'resolved' | 'dismissed' | 'closed';

// Define valid transitions - must match backend
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ['inProgress'],
  submitted: ['inProgress'], // Treat 'submitted' same as 'pending'
  inProgress: ['resolved', 'dismissed'],
  resolved: ['closed'], // Can be closed after resolution
  dismissed: ['closed'], // Can be closed after dismissal
  closed: [] // Final status - cannot be changed
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
    notes?: string,
    attachmentFile?: File,
    closureData?: {
      decisionSummary: string;
      actionTaken: string;
      closureDocument?: File | null;
      finalNotes?: string;
    }
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

    // Notes field applies to investigation/resolution updates; closure uses closureData instead
    const statusesRequiringNotes: ReportStatus[] = ['inProgress', 'resolved'];
    if (statusesRequiringNotes.includes(newStatus) && !notes?.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please provide a description for this status change before submitting.',
        variant: 'destructive',
      });
      return false;
    }

    if (newStatus === 'closed') {
      if (!closureData?.decisionSummary?.trim() || !closureData?.actionTaken?.trim()) {
        toast({
          title: 'Closure Details Required',
          description: 'Please provide a decision summary and actions taken before closing the case.',
          variant: 'destructive',
        });
        return false;
      }
    }

    // Validate minimum length for notes
    if (notes && notes.trim().length < 10) {
      toast({
        title: 'Description Too Short',
        description: 'Please provide at least 10 characters for the status change description.',
        variant: 'destructive',
      });
      return false;
    }

    setIsUpdating(true);

    try {
      // Upload attachment file if provided
      let attachmentUrl: string | null = null;
      if (attachmentFile) {
        try {
          const formData = new FormData();
          formData.append('file', attachmentFile);
          formData.append('upload_preset', 'speakup_evidence');
          
          const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/dqhxq5a4n/upload';
          const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            attachmentUrl = data.secure_url;
          } else {
            console.warn('Failed to upload attachment, continuing without it');
          }
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          // Continue without attachment rather than failing the whole update
        }
      }

      // Upload closure document if provided
      let closureDocumentUrl: string | null = null;
      if (closureData?.closureDocument) {
        try {
          const formData = new FormData();
          formData.append('file', closureData.closureDocument);
          formData.append('upload_preset', 'speakup_evidence');
          
          const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/dqhxq5a4n/upload';
          const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            closureDocumentUrl = data.secure_url;
          }
        } catch (uploadError) {
          console.error('Error uploading closure document:', uploadError);
        }
      }

      // CLIENT-SIDE: Direct Firestore update (no Cloud Functions)
      const { getFirestore, doc, updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
      const db = getFirestore();
      
      const reportRef = doc(db, collectionName, reportId);
      
      const statusUpdate: any = {
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
          notes: notes || null,
          attachmentUrl: attachmentUrl || null,
          attachmentFileName: attachmentFile?.name || null
        })
      };

      // Add closure-specific fields if closing case
      if (newStatus === 'closed' && closureData) {
        statusUpdate.dateResolved = serverTimestamp();
        statusUpdate.decisionSummary = closureData.decisionSummary;
        statusUpdate.actionTaken = closureData.actionTaken;
        statusUpdate.closedBy = currentUser.uid;
        statusUpdate.closedByName = currentUser.displayName || currentUser.email || 'Unknown User';
        
        if (closureDocumentUrl) {
          statusUpdate.closureDocument = closureDocumentUrl;
          statusUpdate.closureDocumentName = closureData.closureDocument?.name || null;
        }
        
        if (closureData.finalNotes) {
          statusUpdate.finalNotes = closureData.finalNotes;
        }
        
        console.log('🔒 [CLOSE CASE] Updating with closure data:', {
          reportId,
          newStatus,
          closureData,
          statusUpdate
        });
      }

      console.log('📝 [STATUS UPDATE] Updating report:', { reportId, newStatus, statusUpdate });
      await updateDoc(reportRef, statusUpdate);
      console.log('✅ [STATUS UPDATE] Successfully updated to:', newStatus);

      // Log manual status change with current user as actor
      try {
        const representative = await RepresentativeService.getByUserId(currentUser.uid);
        const activityRole = toActivityActorRole(representative?.role);

        await CaseActivityService.logStatusChange(
          reportId,
          currentStatus,
          newStatus,
          notes,
          currentUser.uid,
          currentUser.displayName || currentUser.email || 'Unknown User',
          activityRole === 'system' ? 'handler' : activityRole,
          false // isSystemAction = false for manual status changes
        );
        console.log('✅ Status change logged');
      } catch (logError) {
        console.error('⚠️ Failed to log status change:', logError);
        // Don't fail the status update if logging fails
      }

      // Send notification to complainant about status change
      try {
        const { getDoc } = await import('firebase/firestore');
        const reportSnapshot = await getDoc(reportRef);
        
        if (reportSnapshot.exists()) {
          const reportData = reportSnapshot.data();
          const complainantId = reportData.complainantId || reportData.userId;
          const { NotificationService } = await import('../services/notificationService');
          
          // Send notification to complainant
          if (complainantId) {
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
            } else if (newStatus === 'closed') {
              await NotificationService.createNotification(
                complainantId,
                'case_closed',
                'Case Officially Closed',
                `Your case "${reportData.title || 'Untitled'}" has been officially closed and archived. Final decision: ${closureData?.decisionSummary?.substring(0, 100) || 'See case details'}`,
                {
                  priority: 'high',
                  actionUrl: `/case-tracking/${reportId}`,
                  data: {
                    reportId,
                    reportTitle: reportData.title,
                    decisionSummary: closureData?.decisionSummary,
                    actionTaken: closureData?.actionTaken
                  }
                }
              );
            }
          }
          
          // Send notification to ALL admins about status change by handler
          try {
            const RepresentativeServiceModule = await import('../services/representativeService');
            const RepresentativeService = RepresentativeServiceModule.default;
            const admins = await RepresentativeService.getAllAdmins();
            
            const statusLabels = {
              'pending': 'Submitted',
              'submitted': 'Submitted',
              'inProgress': 'Ongoing Investigation',
              'resolved': 'Decision Already Made',
              'dismissed': 'Decision Already Made'
            };
            
            for (const admin of admins) {
              if (admin.userId) {
                await NotificationService.createNotification(
                  admin.userId,
                  'status_update',
                  `Case Status Updated to ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}`,
                  `${currentUser.displayName || currentUser.email} updated case "${reportData.title || 'Untitled'}" to ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}${notes ? ': ' + notes.substring(0, 100) : ''}`,
                  {
                    priority: newStatus === 'resolved' || newStatus === 'dismissed' ? 'high' : 'normal',
                    actionUrl: `/admin/reports?reportId=${reportId}`,
                    data: {
                      reportId,
                      reportTitle: reportData.title,
                      previousStatus: currentStatus,
                      newStatus,
                      updatedBy: currentUser.displayName || currentUser.email,
                      notes: notes || null
                    }
                  }
                );
              }
            }
          } catch (adminNotifError) {
            console.error('Failed to notify admins about status change:', adminNotifError);
          }
        }
      } catch (notifError) {
        console.error('Failed to send status update notification:', notifError);
        // Don't fail the status update if notification fails
      }

      toast({
        title: newStatus === 'closed' ? 'Case Closed Successfully' : 'Status Updated',
        description: newStatus === 'closed' 
          ? 'Case has been officially closed and archived. The complainant has been notified.'
          : `Report status changed to ${getStatusLabel(newStatus)}`,
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
      pending: 'Submitted',
      submitted: 'Submitted',
      inProgress: 'Ongoing Investigation',
      resolved: 'Decision Already Made',
      dismissed: 'Decision Already Made',
      closed: 'Closed'
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
      dismissed: 'bg-gray-100 text-gray-800',
      closed: 'bg-gray-200 text-gray-900'
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

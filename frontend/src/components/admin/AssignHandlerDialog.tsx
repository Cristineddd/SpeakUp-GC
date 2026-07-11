import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { RepresentativeService } from '../../services/representativeService';
import { NotificationService } from '../../services/notificationService';
import { CaseActivityService } from '../../services/caseActivityService';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Representative } from '../../types/representative';
import type { AdminReport } from '../../services/adminReportService';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/representative';
import { User, Clock, Briefcase } from 'lucide-react';

interface AssignHandlerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint: AdminReport;
  onAssigned?: () => void;
}

export function AssignHandlerDialog({
  open,
  onOpenChange,
  complaint,
  onAssigned
}: AssignHandlerDialogProps) {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedCODI, setSelectedCODI] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingReps, setFetchingReps] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Fetch representatives on mount
  useEffect(() => {
    if (open) {
      fetchRepresentatives();
    }
  }, [open]);

  const fetchRepresentatives = async () => {
    try {
      console.log('🔄 Starting to fetch representatives...');
      console.log('📋 Dialog opened for complaint:', complaint.id);
      setFetchingReps(true);
      
      // Only fetch CODI members and admins (Dean and Coordinator are view-only for analytics)
      console.log('📡 Calling RepresentativeService.getAll with isActive: true');
      const reps = await RepresentativeService.getAll({ isActive: true });
      console.log('📊 All representatives fetched:', reps);
      console.log('📊 Total representatives:', reps.length);
      
      // Show role breakdown
      const roleBreakdown = reps.reduce((acc: any, rep) => {
        acc[rep.role] = (acc[rep.role] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Representatives by role:', roleBreakdown);
      
      // Filter only CODI members (exclude admin, dean and coordinator)
      // Admins can assign cases but cannot be assigned cases themselves
      const codiMembers = reps.filter(rep => 
        rep.role === 'handler' || rep.role === 'codi'
      );
      
      console.log('👥 Filtered CODI members:', codiMembers);
      console.log('👥 Total CODI members:', codiMembers.length);
      
      if (codiMembers.length === 0) {
        console.warn('⚠️ NO CODI MEMBERS FOUND!');
        console.warn('💡 Tip: Go to Admin > Representatives Management to add CODI members');
        console.warn('💡 Make sure representatives have role "handler" or "codi"');
        console.warn('💡 Make sure representatives have isActive: true');
      }
      
      setRepresentatives(codiMembers);
      
      // Pre-select current CODI member if exists
      if (complaint.assignedTo) {
        console.log('✅ Pre-selecting CODI member:', complaint.assignedTo);
        setSelectedCODI(complaint.assignedTo);
      }
      
      console.log('✅ Representatives fetch completed successfully');
    } catch (error) {
      console.error('❌ Error fetching representatives:', error);
      console.error('❌ Error details:', error);
      toast({
        title: 'Error Loading Representatives',
        description: error instanceof Error ? error.message : 'Failed to load representatives. Check console for details.',
        variant: 'destructive'
      });
    } finally {
      setFetchingReps(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCODI) {
      toast({
        title: 'No CODI Member Selected',
        description: 'Please select a CODI member to assign this case',
        variant: 'destructive'
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to assign cases',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Get selected representative details
      const codiMember = representatives.find(r => r.id === selectedCODI);
      if (!codiMember) {
        throw new Error('Selected CODI member not found');
      }

      // ✅ Validate CODI member UID exists in database
      console.log('🔍 Validating CODI member UID:', codiMember.id);
      const codiRef = doc(db, 'representatives', codiMember.id);
      const codiSnapshot = await getDoc(codiRef);
      
      if (!codiSnapshot.exists()) {
        console.error('❌ CODI member UID validation failed - account does not exist:', codiMember.id);
        toast({
          title: 'Invalid CODI Member Account',
          description: `The selected CODI member account (${codiMember.displayName}) no longer exists in the system. Please refresh and select another CODI member.`,
          variant: 'destructive'
        });
        return;
      }
      
      // Verify CODI member is still active
      const codiData = codiSnapshot.data();
      if (!codiData.isActive) {
        console.warn('⚠️ CODI member account is inactive:', codiMember.id);
        toast({
          title: 'Inactive CODI Member',
          description: `${codiMember.displayName} is no longer active. Please select another CODI member.`,
          variant: 'destructive'
        });
        return;
      }
      
      console.log('✅ CODI member UID validation passed:', codiMember.id);

      const now = Timestamp.now();
      const nowISO = now.toDate().toISOString();

      // Calculate time to assignment (hours from submission)
      const submittedAt = new Date(complaint.reportedAt);
      const timeToAssignment = (now.toDate().getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

      // Create CODI member history entry
      const historyEntry: any = {
        handlerId: codiMember.id,
        handlerName: codiMember.displayName,
        handlerRole: codiMember.role,
        assignedAt: nowISO,
        assignedBy: currentUser.uid,
        assignedByName: currentUser.email || 'Admin'
      };

      // Only add notes if provided
      if (notes && notes.trim()) {
        historyEntry.notes = notes.trim();
      }

      // If there was a previous CODI member, mark them as unassigned
      const handlerHistory = complaint.handlerHistory || [];
      if (complaint.assignedTo && complaint.assignedTo !== selectedCODI) {
        // Find the last active assignment and mark it as unassigned
        const lastIndex = handlerHistory.length - 1;
        if (lastIndex >= 0 && !handlerHistory[lastIndex].unassignedAt) {
          handlerHistory[lastIndex] = {
            ...handlerHistory[lastIndex],
            unassignedAt: nowISO,
            unassignedBy: currentUser.uid,
            unassignedReason: 'Reassigned to another CODI member'
          };
        }

        // Unassign case from previous CODI member
        if (complaint.assignedTo) {
          await RepresentativeService.unassignCase(complaint.assignedTo, complaint.id);
        }
      }

      // Prepare update data (excluding undefined values)
      const updateData: any = {
        assignedTo: codiMember.id,
        assignedToName: codiMember.displayName,
        assignedToRole: codiMember.role,
        assignedAt: now,
        assignedBy: currentUser.uid,
        assignedByName: currentUser.email || 'Admin',
        handlerHistory: [...handlerHistory, historyEntry],
        timeToAssignment: Math.round(timeToAssignment),
        lastActivityAt: now,
        updatedAt: now,
        status: complaint.status === 'pending' ? 'inProgress' : complaint.status
      };

      // Only add processingStartedAt if not already set
      if (!complaint.processingStartedAt) {
        updateData.processingStartedAt = now;
      }

      console.log('📝 Assigning case to handler:', {
        complaintId: complaint.id,
        handlerId: codiMember.id,
        handlerName: codiMember.displayName,
        handlerRole: codiMember.role,
        updateData
      });

      // Update complaint with new handler
      const complaintRef = doc(db, 'complaints', complaint.id);
      
      try {
        await updateDoc(complaintRef, updateData);
        console.log('✅ Complaint document updated in Firestore');
        
        // Verify the update by reading back
        const updatedDoc = await getDoc(complaintRef);
        if (updatedDoc.exists()) {
          const verifyData = updatedDoc.data();
          console.log('🔍 Verifying update - assignedTo:', verifyData.assignedTo);
          console.log('🔍 Verifying update - assignedToName:', verifyData.assignedToName);
          
          if (verifyData.assignedTo === codiMember.id) {
            console.log('✅ VERIFIED: Assignment saved correctly!');
          } else {
            console.error('❌ VERIFICATION FAILED: assignedTo does not match!');
            console.error('Expected:', codiMember.id);
            console.error('Got:', verifyData.assignedTo);
          }
        }
      } catch (error) {
        console.error('❌ ERROR updating complaint document:', error);
        throw error; // Re-throw to be caught by outer try-catch
      }

      // Assign case to representative
      await RepresentativeService.assignCase(codiMember.id, complaint.id);

      console.log('✅ Case added to representative assignedCases array');
      console.log('✅ Case assigned successfully - CODI member should now see this case');

      // Log manual handler assignment with current user as actor
      try {
        await CaseActivityService.logHandlerAssignment(
          complaint.id,
          codiMember.displayName,
          codiMember.userId,
          currentUser?.uid,
          currentUser?.displayName || 'Admin',
          false // isSystemAction = false for manual assignment
        );
        console.log('✅ Handler assignment logged');
      } catch (logError) {
        console.error('⚠️ Failed to log handler assignment:', logError);
        // Don't fail assignment if logging fails
      }

      // Send notification to complainant
      try {
        const complainantId = complaint.userId;
        if (complainantId) {
          await NotificationService.sendComplaintAssignedNotification(
            complainantId,
            complaint.id,
            complaint.title,
            codiMember.displayName
          );
          console.log('✅ Notification sent to complainant');
        }
      } catch (notifError) {
        console.error('⚠️ Failed to send notification to complainant:', notifError);
        // Don't fail assignment if notification fails
      }

      // Send notification to assigned CODI member (only if someone else is assigning)
      try {
        // Skip notification if CODI member is assigning to themselves
        if (currentUser?.uid !== codiMember.userId) {
          // Use codiMember.userId (Firebase Auth UID) for notification, not codiMember.id (representative doc ID)
          await NotificationService.sendHandlerCaseAssignedNotification(
            codiMember.userId,
            complaint.id,
            complaint.title,
            complaint.userName || 'Anonymous',
            complaint.category || 'General',
            complaint.severity || 'Medium'
          );
          console.log('✅ Notification sent to CODI member:', codiMember.userId);
        } else {
          console.log('ℹ️ CODI member assigning to themselves, skipping notification');
        }
      } catch (notifError) {
        console.error('⚠️ Failed to send handler notification:', notifError);
      }

      toast({
        title: 'Case Assigned',
        description: `Case assigned to ${codiMember.displayName} (${ROLE_LABELS[codiMember.role]})`
      });

      // Reset form
      setNotes('');
      
      // Close dialog first
      onOpenChange(false);
      
      // Wait longer to ensure Firestore has propagated the change to all clients
      // This is important so the handler can see the case when they click the notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then call callback to refresh the list
      if (onAssigned) {
        console.log('🔄 Calling onAssigned callback to refresh reports list');
        onAssigned();
      }

    } catch (error) {
      console.error('❌ Error assigning case:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign case. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!complaint.assignedTo) return;
    if (!currentUser) return;

    try {
      setLoading(true);

      const now = Timestamp.now();
      const nowISO = now.toDate().toISOString();

      // Update handler history
      const handlerHistory = complaint.handlerHistory || [];
      const lastIndex = handlerHistory.length - 1;
      if (lastIndex >= 0 && !handlerHistory[lastIndex].unassignedAt) {
        handlerHistory[lastIndex] = {
          ...handlerHistory[lastIndex],
          unassignedAt: nowISO,
          unassignedBy: currentUser.uid,
          unassignedReason: notes || 'Unassigned by admin'
        };
      }

      // Update complaint
      const complaintRef = doc(db, 'complaints', complaint.id);
      await updateDoc(complaintRef, {
        assignedTo: null,
        assignedToName: null,
        assignedToRole: null,
        assignedAt: null,
        assignedBy: null,
        assignedByName: null,
        handlerHistory,
        lastActivityAt: now,
        updatedAt: now
      });

      // Unassign from representative
      await RepresentativeService.unassignCase(complaint.assignedTo, complaint.id);

      toast({
        title: 'Case Unassigned',
        description: 'Handler removed from this case'
      });

      setSelectedCODI('');
      setNotes('');
      
      if (onAssigned) {
        onAssigned();
      }

      onOpenChange(false);

    } catch (error) {
      console.error('❌ Error unassigning case:', error);
      toast({
        title: 'Unassignment Failed',
        description: 'Failed to unassign case. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get role description
  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'handler':
        return 'Case Handler - Handles and resolves complaints';
      case 'admin':
        return 'Administrator - Full access including case handling';
      case 'dean':
        return 'Dean - View-only access for analytics and reports';
      case 'coordinator':
        return 'Coordinator - View-only access for analytics and reports';
      default:
        return ROLE_LABELS[role as any] || role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Case Handler</DialogTitle>
          <DialogDescription>
            Assign this case to a case handler for processing. Only users with "Handler" role can be assigned cases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Case Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold">Case Details</h4>
            <p className="text-sm"><strong>Title:</strong> {complaint.title}</p>
            <p className="text-sm"><strong>Category:</strong> {complaint.category}</p>
            <p className="text-sm"><strong>Submitted:</strong> {new Date(complaint.reportedAt).toLocaleString()}</p>
          </div>

          {/* Current Handler (if exists) */}
          {complaint.assignedToName && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Currently Assigned To:</p>
              <div className="flex items-center gap-2 mt-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900">{complaint.assignedToName}</span>
                <Badge className={ROLE_COLORS[complaint.assignedToRole as any]}>
                  {ROLE_LABELS[complaint.assignedToRole as any]}
                </Badge>
              </div>
              {complaint.assignedAt && (
                <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Assigned on {new Date(complaint.assignedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Case Handler Selection */}
          <div className="space-y-2">
            <Label>Select Case Handler</Label>
            {fetchingReps ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Loading case handlers...
              </div>
            ) : representatives.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-amber-900">⚠️ No Case Handlers Available</p>
                <p className="text-xs text-amber-700">
                  No active case handlers found. Please add representatives with "Handler" role.
                </p>
                <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
                  <li>Go to <strong>Admin → Representatives Management</strong></li>
                  <li>Add representatives with role <strong>"Handler"</strong></li>
                  <li>Make sure they are marked as <strong>Active</strong></li>
                  <li><em>Note: Administrators cannot be assigned cases</em></li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded">
                  <strong>Showing:</strong> Case Handlers only (Administrators manage but are not assigned cases)
                </div>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {representatives.map((rep) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setSelectedCODI(rep.id)}
                      className={`
                        p-3 border rounded-lg text-left transition-all
                        ${selectedCODI === rep.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{rep.displayName}</p>
                            <p className="text-xs text-muted-foreground">{rep.email}</p>
                          </div>
                        </div>
                        <Badge className={ROLE_COLORS[rep.role]}>
                          {ROLE_LABELS[rep.role]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {rep.department}
                        </span>
                        <span>Active Cases: {rep.activeCases}</span>
                        <span className={`
                          inline-flex items-center gap-1
                          ${rep.onlineStatus === 'online' ? 'text-green-600' : 'text-gray-500'}
                        `}>
                          <span className={`
                            h-2 w-2 rounded-full
                            ${rep.onlineStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'}
                          `} />
                          {rep.onlineStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getRoleDescription(rep.role)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this assignment for reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {complaint.assignedTo && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnassign}
              disabled={loading}
            >
              Unassign Handler
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={loading || !selectedCODI || representatives.length === 0}
          >
            {loading ? 'Assigning...' : complaint.assignedTo ? 'Reassign' : 'Assign CODI Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignHandlerDialog;
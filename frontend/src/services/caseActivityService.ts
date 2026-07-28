import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  onSnapshot,
  Timestamp,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase';
import { CaseActivity, CreateCaseActivityInput, ActivityType, SYSTEM_ACTOR, type ActivityActorRole } from '../types/caseActivity';

export class CaseActivityService {
  private static COLLECTION = 'caseActivities';

  /**
   * Create a new case activity
   */
  static async createActivity(
    input: CreateCaseActivityInput,
    userId: string,
    userName: string,
    userRole: ActivityActorRole,
    targetUserId?: string,
    targetUserName?: string,
    isInternal: boolean = false
  ): Promise<string> {
    try {
      console.log('📝 Creating case activity:', input);
      
      const activityData = {
        complaintId: input.complaintId,
        activityType: input.activityType,
        description: input.description,
        findings: input.findings || '',
        performedBy: userId,
        performedByName: userName,
        performedByRole: userRole,
        targetUserId: targetUserId || null,
        targetUserName: targetUserName || null,
        createdAt: Timestamp.now(),
        attachments: input.attachments || [],
        isInternal: isInternal,
        metadata: input.metadata || {}
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), activityData);
      console.log('✅ Activity created with ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating activity:', error);
      throw error;
    }
  }

  /**
   * Get all activities for a complaint
   */
  static async getActivitiesByComplaint(complaintId: string): Promise<CaseActivity[]> {
    try {
      console.log('🔍 Fetching activities for complaint:', complaintId);
      
      const q = query(
        collection(db, this.COLLECTION),
        where('complaintId', '==', complaintId),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const activities: CaseActivity[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          complaintId: data.complaintId,
          activityType: data.activityType as ActivityType,
          description: data.description,
          findings: data.findings,
          performedBy: data.performedBy,
          performedByName: data.performedByName,
          performedByRole: data.performedByRole,
          targetUserId: data.targetUserId,
          targetUserName: data.targetUserName,
          createdAt: data.createdAt?.toDate() || new Date(),
          attachments: data.attachments || [],
          isInternal: data.isInternal || false,
          metadata: data.metadata || {}
        });
      });

      console.log(`✅ Found ${activities.length} activities`);
      return activities;
    } catch (error) {
      console.error('❌ Error fetching activities:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time activity updates
   */
  static subscribeToActivities(
    complaintId: string,
    callback: (activities: CaseActivity[]) => void
  ): Unsubscribe {
    console.log('👂 Subscribing to activities for complaint:', complaintId);
    
    const q = query(
      collection(db, this.COLLECTION),
      where('complaintId', '==', complaintId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const activities: CaseActivity[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          complaintId: data.complaintId,
          activityType: data.activityType as ActivityType,
          description: data.description,
          findings: data.findings,
          performedBy: data.performedBy,
          performedByName: data.performedByName,
          performedByRole: data.performedByRole,
          targetUserId: data.targetUserId,
          targetUserName: data.targetUserName,
          createdAt: data.createdAt?.toDate() || new Date(),
          attachments: data.attachments || [],
          isInternal: data.isInternal || false,
          metadata: data.metadata || {}
        });
      });

      console.log(`🔄 Activity update: ${activities.length} activities`);
      callback(activities);
    });
  }

  /**
   * Auto-log activity when status changes
   */
  static async logStatusChange(
    complaintId: string,
    oldStatus: string,
    newStatus: string,
    notes: string | undefined,
    userId?: string,
    userName?: string,
    userRole?: 'admin' | 'handler' | 'codi',
    isSystemAction: boolean = false
  ): Promise<void> {
    try {
      const statusLabels: Record<string, string> = {
        'pending': 'Submitted',
        'submitted': 'Submitted',
        'assigned': 'Submitted',
        'inProgress': 'Ongoing Investigation',
        'ongoing': 'Ongoing Investigation',
        'investigating': 'Ongoing Investigation',
        'resolved': 'Decision Already Made',
        'dismissed': 'Decision Already Made'
      };

      // Use System actor for automated actions
      const actorId = isSystemAction ? SYSTEM_ACTOR.id : (userId || SYSTEM_ACTOR.id);
      const actorName = isSystemAction ? SYSTEM_ACTOR.name : (userName || SYSTEM_ACTOR.name);
      const actorRole = isSystemAction ? SYSTEM_ACTOR.role : (userRole || 'admin');

      await this.createActivity(
        {
          complaintId,
          activityType: ActivityType.STATUS_UPDATE,
          description: isSystemAction 
            ? `Complaint status automatically updated to ${statusLabels[newStatus] || newStatus} following submission.`
            : `Case status updated from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}`,
          findings: notes || `Status changed to ${statusLabels[newStatus] || newStatus}`,
          metadata: {
            statusBefore: oldStatus,
            statusAfter: newStatus,
            ...(notes && { notes }),
            isSystemAction
          }
        },
        actorId,
        actorName,
        actorRole
      );
    } catch (error) {
      console.error('❌ Error logging status change:', error);
    }
  }

  /**
   * Log complaint submission (handler/admin only — typically not called from complainant client).
   */
  static async logComplaintSubmission(complaintId: string): Promise<void> {
    try {
      await this.createActivity(
        {
          complaintId,
          activityType: ActivityType.DOCUMENT_REVIEW,
          description: 'Formal complaint submitted',
          findings: 'Complaint received and recorded. Awaiting case handler assignment.',
          metadata: { event: 'complaint_submitted' },
        },
        SYSTEM_ACTOR.id,
        SYSTEM_ACTOR.name,
        SYSTEM_ACTOR.role
      );
    } catch (error) {
      console.error('❌ Error logging complaint submission:', error);
    }
  }

  /**
   * Auto-log handler assignment
   */
  static async logHandlerAssignment(
    complaintId: string,
    handlerName: string,
    handlerId?: string,
    userId?: string,
    userName?: string,
    isSystemAction: boolean = false,
    maskHandlerIdentity: boolean = false
  ): Promise<void> {
    try {
      // Use System actor for automated actions
      const actorId = isSystemAction ? SYSTEM_ACTOR.id : (userId || SYSTEM_ACTOR.id);
      const actorName = isSystemAction ? SYSTEM_ACTOR.name : (userName || SYSTEM_ACTOR.name);
      const actorRole = isSystemAction ? SYSTEM_ACTOR.role : 'admin';

      const publicDescription = maskHandlerIdentity
        ? 'Case handler assigned'
        : isSystemAction
          ? `Case automatically assigned to CODI member ${handlerName} for review.`
          : 'Case handler assigned';

      const publicFindings = maskHandlerIdentity
        ? 'A case handler has been assigned to your report. You will be contacted when the investigation begins.'
        : `${handlerName} has been assigned to handle this case. The investigation will begin once the handler reviews the complaint.`;

      await this.createActivity(
        {
          complaintId,
          activityType: ActivityType.ASSIGNMENT,
          description: publicDescription,
          findings: publicFindings,
          metadata: {
            assignedHandler: maskHandlerIdentity ? undefined : handlerName,
            isSystemAction,
            maskHandlerIdentity,
          }
        },
        actorId,
        actorName,
        actorRole,
        maskHandlerIdentity ? undefined : handlerId,
        maskHandlerIdentity ? undefined : handlerName
      );
    } catch (error) {
      console.error('❌ Error logging handler assignment:', error);
    }
  }
}

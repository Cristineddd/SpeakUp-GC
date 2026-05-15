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
import { CaseActivity, CreateCaseActivityInput, ActivityType } from '../types/caseActivity';

export class CaseActivityService {
  private static COLLECTION = 'caseActivities';

  /**
   * Create a new case activity
   */
  static async createActivity(
    input: CreateCaseActivityInput,
    userId: string,
    userName: string,
    userRole: 'admin' | 'handler'
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
        createdAt: Timestamp.now(),
        attachments: input.attachments || [],
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
          createdAt: data.createdAt?.toDate() || new Date(),
          attachments: data.attachments || [],
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
          createdAt: data.createdAt?.toDate() || new Date(),
          attachments: data.attachments || [],
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
    userId: string,
    userName: string,
    userRole: 'admin' | 'handler'
  ): Promise<void> {
    try {
      const statusLabels: Record<string, string> = {
        'pending': 'Pending',
        'submitted': 'Submitted',
        'inProgress': 'In Progress',
        'investigating': 'Investigating',
        'resolved': 'Resolved',
        'dismissed': 'Dismissed'
      };

      await this.createActivity(
        {
          complaintId,
          activityType: ActivityType.STATUS_UPDATE,
          description: `Case status updated from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}`,
          findings: notes || `Status changed to ${statusLabels[newStatus] || newStatus}`,
          metadata: {
            statusBefore: oldStatus,
            statusAfter: newStatus,
            notes
          }
        },
        userId,
        userName,
        userRole
      );
    } catch (error) {
      console.error('❌ Error logging status change:', error);
    }
  }

  /**
   * Auto-log handler assignment
   */
  static async logHandlerAssignment(
    complaintId: string,
    handlerName: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.createActivity(
        {
          complaintId,
          activityType: ActivityType.ASSIGNMENT,
          description: 'Case handler assigned',
          findings: `${handlerName} has been assigned to handle this case. The investigation process will begin shortly.`,
          metadata: {
            assignedHandler: handlerName
          }
        },
        userId,
        userName,
        'admin'
      );
    } catch (error) {
      console.error('❌ Error logging handler assignment:', error);
    }
  }
}

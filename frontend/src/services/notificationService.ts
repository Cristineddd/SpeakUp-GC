import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  onSnapshot,
  Timestamp,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationPreferences,
  NotificationStats,
} from '../types/notification';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notification';

export class NotificationService {
  private static readonly notificationsCollection = 'notifications';
  private static readonly preferencesCollection = 'notificationPreferences';

  /** In-app only — chat / read receipts should not spam EmailJS (assignment & status still email). 
   * Internal notes ('new_comment', 'comment_added' for internal use) are also suppressed from email
   * to prevent complainants from being notified about admin/handler private conversations. */
  private static readonly emailSuppressedTypes: ReadonlySet<NotificationType> = new Set([
    'new_message',
    'message_read',
    'new_comment',
  ]);
  private static readonly errorHandler = (error: any, context: string) => {
    console.error(`[NotificationService] ${context}:`, error);
    throw error;
  };

  /**
   * Send notification when a complaint is created by user
   */
  static async sendComplaintCreatedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string
  ): Promise<string> {
    return this.createNotification(
      userId,
      'complaint_created' as NotificationType,
      'Complaint Submitted',
      `Your complaint "${complaintTitle}" has been submitted successfully and is under review.`,
      {
        priority: 'normal',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Complaint'
      }
    );
  }

  /**
   * Send a notification when a complaint is assigned to a handler
   */
  static async sendComplaintAssignedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    handlerName: string
  ): Promise<string> {
    return this.createNotification(
      userId,
      'complaint_assigned' as NotificationType,
      'CODI Member Assigned',
      `Your complaint "${complaintTitle}" has been assigned to ${handlerName} for resolution.`,
      {
        priority: 'high',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Case'
      }
    );
  }

  /**
   * Send notification to handler when a case is assigned to them
   */
  static async sendHandlerCaseAssignedNotification(
    handlerId: string,
    complaintId: string,
    complaintTitle: string,
    complainantName: string,
    category: string,
    severity: string
  ): Promise<string> {
    const assignedAt = new Date();
    const formattedTime = assignedAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return this.createNotification(
      handlerId,
      'case_assigned' as NotificationType,
      'New Case Assigned to You',
      `You have been assigned to handle "${complaintTitle}" from ${complainantName}. Assigned on ${formattedTime}. Category: ${category}, Severity: ${severity}.`,
      {
        priority: 'high',
        complaintId: complaintId,
        actionUrl: `/admin/reports?reportId=${complaintId}&tab=details`,
        actionLabel: 'View Case Details',
        data: {
          complainantName: complainantName,
          category: category,
          severity: severity,
          assignedAt: assignedAt.toISOString()
        }
      }
    );
  }

  /**
   * Send notification when complaint status changes
   */
  static async sendComplaintStatusNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    newStatus: 'pending' | 'inProgress' | 'resolved' | 'dismissed',
    notes?: string
  ): Promise<string> {
    const statusMessages = {
      pending: 'has been submitted and is under review',
      inProgress: 'is now under ongoing investigation',
      resolved: 'has a decision already made',
      dismissed: 'has a decision already made'
    };

    const priorityMap = {
      pending: 'normal' as NotificationPriority,
      inProgress: 'high' as NotificationPriority,
      resolved: 'high' as NotificationPriority,
      dismissed: 'normal' as NotificationPriority
    };

    const statusTitles = {
      pending: 'Complaint Submitted',
      inProgress: 'Ongoing Investigation',
      resolved: 'Decision Already Made',
      dismissed: 'Decision Already Made'
    };

    return await this.createNotification(
      userId,
      'status_update' as NotificationType,
      statusTitles[newStatus],
      `Your complaint "${complaintTitle}" ${statusMessages[newStatus]}.${notes ? ` Notes: ${notes}` : ''}`,
      {
        priority: priorityMap[newStatus],
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Details',
        data: {
          status: newStatus,
          updatedAt: new Date().toISOString(),
          notes: notes
        }
      }
    );
  }

  /**
   * Alias for sendComplaintStatusNotification (for compatibility)
   */
  static async sendStatusUpdateNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    newStatus: string,
    notes?: string
  ): Promise<string> {
    return this.sendComplaintStatusNotification(
      userId,
      complaintId,
      complaintTitle,
      newStatus as 'pending' | 'inProgress' | 'resolved' | 'dismissed',
      notes
    );
  }

  /**
   * Send notification when a comment is added to complaint
   */
  static async sendCommentAddedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    commentBy: string,
    commentText: string
  ): Promise<string> {
    return await this.createNotification(
      userId,
      'new_comment' as NotificationType,
      'New Comment on Your Complaint',
      `"${commentText}" - ${commentBy}`,
      {
        priority: 'normal',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}#comments`,
        actionLabel: 'View Comments',
        data: {
          commentBy: commentBy,
          commentPreview: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : '')
        }
      }
    );
  }

  /**
   * Send notification when an internal case note is added
   * 
   * ⚠️ IMPORTANT: This notification is ONLY for admin and CODI member recipients.
   * Internal notes are NEVER visible to complainants.
   * The userId parameter MUST be a userId from the representatives collection (admin or handler).
   * Email notifications are suppressed for this type to prevent accidental disclosure.
   * 
   * @param userId - The userId of the admin or handler recipient (from representatives collection)
   * @param caseId - The case/complaint ID
   * @param caseTitle - The title of the case
   * @param noteBy - Display name of the person who created the note
   * @param noteByRole - Role of the note creator ('admin' or 'handler')
   * @param noteText - The content of the internal note
   */
  static async sendCaseNoteNotification(
    userId: string,
    caseId: string,
    caseTitle: string,
    noteBy: string,
    noteByRole: 'admin' | 'handler',
    noteText: string
  ): Promise<string> {
    const roleLabel = noteByRole === 'admin' ? 'Admin' : 'CODI Member';
    return await this.createNotification(
      userId,
      'case_note' as NotificationType,
      `New Internal Note from ${roleLabel}`,
      `${noteBy}: "${noteText.substring(0, 100)}${noteText.length > 100 ? '...' : ''}"`,
      {
        priority: 'normal',
        complaintId: caseId,
        actionUrl: `/admin/reports?id=${caseId}`,
        actionLabel: 'View Case',
        data: {
          noteBy: noteBy,
          noteByRole: noteByRole,
          notePreview: noteText.substring(0, 200),
          isInternalNote: true  // Flag to trigger recipient verification
        }
      }
    );
  }

  /**
   * Send notification when evidence is requested
   */
  static async sendEvidenceRequestedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    requestedBy: string,
    details?: string
  ): Promise<string> {
    return await this.createNotification(
      userId,
      'evidence_requested' as NotificationType,
      'Additional Evidence Requested',
      `Your complaint "${complaintTitle}" requires additional evidence. ${details ? `Details: ${details}` : ''}`,
      {
        priority: 'high',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}/evidence`,
        actionLabel: 'Submit Evidence',
        data: {
          requestedBy: requestedBy,
          details: details
        }
      }
    );
  }

  /**
   * Send notification when deadline is approaching
   */
  static async sendDeadlineReminderNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    daysRemaining: number
  ): Promise<string> {
    const dayText = daysRemaining === 1 ? 'day' : 'days';
    return await this.createNotification(
      userId,
      'deadline_reminder' as NotificationType,
      'Deadline Approaching',
      `Your complaint "${complaintTitle}" has ${daysRemaining} ${dayText} until resolution deadline.`,
      {
        priority: daysRemaining <= 2 ? 'high' : 'normal',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Complaint',
        data: {
          daysRemaining: daysRemaining,
          deadlineDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    );
  }

  /**
   * Send notification when complaint is escalated
   */
  static async sendComplaintEscalatedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    reason?: string
  ): Promise<string> {
    return await this.createNotification(
      userId,
      'complaint_escalated' as NotificationType,
      'Complaint Escalated',
      `Your complaint "${complaintTitle}" has been escalated to higher management.${reason ? ` Reason: ${reason}` : ''}`,
      {
        priority: 'high',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Details',
        data: {
          escalatedAt: new Date().toISOString(),
          reason: reason
        }
      }
    );
  }

  /**
   * Send notification when complaint requires user action
   */
  static async sendActionRequiredNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    actionType: string,
    instructions?: string
  ): Promise<string> {
    return await this.createNotification(
      userId,
      'action_required' as NotificationType,
      'Action Required on Your Complaint',
      `Your complaint "${complaintTitle}" requires your ${actionType}. ${instructions || 'Please take necessary action.'}`,
      {
        priority: 'urgent',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'Take Action',
        data: {
          actionType: actionType,
          instructions: instructions,
          requiredBy: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days default
        }
      }
    );
  }

  /**
   * Send notification when complaint is reopened
   */
  static async sendComplaintReopenedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    reason?: string
  ): Promise<string> {
    return await this.createNotification(
      userId,
      'complaint_reopened' as NotificationType,
      'Complaint Reopened',
      `Your complaint "${complaintTitle}" has been reopened for further review.${reason ? ` Reason: ${reason}` : ''}`,
      {
        priority: 'high',
        complaintId: complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Details',
        data: {
          reopenedAt: new Date().toISOString(),
          reason: reason
        }
      }
    );
  }

  /**
   * Send notification when complaint is resolved
   */
  static async sendComplaintResolvedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    resolutionNotes?: string
  ): Promise<string> {
    return await this.sendComplaintStatusNotification(
      userId,
      complaintId,
      complaintTitle,
      'resolved',
      resolutionNotes
    );
  }

  /**
   * Send notification when complaint is marked as pending
   */
  static async sendComplaintPendingNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    notes?: string
  ): Promise<string> {
    return await this.sendComplaintStatusNotification(
      userId,
      complaintId,
      complaintTitle,
      'pending',
      notes
    );
  }

  /**
   * Send notification when complaint is in progress
   */
  static async sendComplaintInProgressNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    notes?: string
  ): Promise<string> {
    return await this.sendComplaintStatusNotification(
      userId,
      complaintId,
      complaintTitle,
      'inProgress',
      notes
    );
  }

  /**
   * Send notification when complaint is dismissed
   */
  static async sendComplaintDismissedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    notes?: string
  ): Promise<string> {
    return await this.sendComplaintStatusNotification(
      userId,
      complaintId,
      complaintTitle,
      'dismissed',
      notes
    );
  }

  /**
   * Send notification to respondent when a complaint is filed against them.
   * Includes anti-retaliation notice per RA 11313 / RA 7877.
   */
  static async sendRespondentComplaintNotification(
    respondentUserId: string,
    complaintId: string,
    complaintTitle: string
  ): Promise<string> {
    return this.createNotification(
      respondentUserId,
      'complaint_filed_against_you' as NotificationType,
      'A Complaint Has Been Filed Against You',
      `A formal complaint titled "${complaintTitle}" has been filed against you and is now under review by the DEIU office. ` +
      `You will be formally notified of the details and your right to respond. ` +
      `⚠️ Anti-Retaliation Notice: Any act of retaliation against the complainant is strictly prohibited under RA 11313 (Safe Spaces Act) and RA 7877 (Anti-Sexual Harassment Act) and may result in additional sanctions.`,
      {
        priority: 'urgent',
        complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Details',
        data: { isRespondent: true }
      }
    );
  }

  /**
   * Send hearing scheduled notification to both complainant and respondent.
   */
  static async sendHearingScheduledNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    hearingDate: string,
    hearingTime: string,
    hearingVenue: string,
    isRespondent = false
  ): Promise<string> {
    const role = isRespondent ? 'respondent' : 'complainant';
    return this.createNotification(
      userId,
      'hearing_scheduled' as NotificationType,
      'Formal Hearing Scheduled',
      `A formal hearing for the complaint "${complaintTitle}" has been scheduled. ` +
      `Date: ${hearingDate} at ${hearingTime}, Venue: ${hearingVenue}. ` +
      `You are required to attend as the ${role}. ` +
      `Please bring all relevant documents and evidence.`,
      {
        priority: 'urgent',
        complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Hearing Details',
        data: { hearingDate, hearingTime, hearingVenue, isRespondent }
      }
    );
  }

  /**
   * Send hearing reminder (e.g., 24 hours before).
   */
  static async sendHearingReminderNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    hearingDate: string,
    hearingTime: string,
    hearingVenue: string
  ): Promise<string> {
    return this.createNotification(
      userId,
      'hearing_reminder' as NotificationType,
      'Hearing Tomorrow – Reminder',
      `Reminder: Your formal hearing for "${complaintTitle}" is scheduled tomorrow, ${hearingDate} at ${hearingTime}, ${hearingVenue}. Please be prepared.`,
      {
        priority: 'high',
        complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Hearing Details',
        data: { hearingDate, hearingTime, hearingVenue }
      }
    );
  }

  /**
   * Send final decision notification to both complainant and respondent.
   * Required by RA 11313 and RA 7877 for formal complaint resolution.
   */
  static async sendDecisionIssuedNotification(
    userId: string,
    complaintId: string,
    complaintTitle: string,
    decision: 'resolved' | 'dismissed',
    decisionSummary?: string,
    isRespondent = false
  ): Promise<string> {
    const decisionLabel = decision === 'resolved' ? 'Upheld / Resolved' : 'Dismissed';
    const role = isRespondent ? 'respondent' : 'complainant';
    return this.createNotification(
      userId,
      'decision_issued' as NotificationType,
      `Complaint Decision: ${decisionLabel}`,
      `The DEIU office has issued a final decision on the complaint "${complaintTitle}". ` +
      `Decision: ${decisionLabel}. ` +
      (decisionSummary ? `Summary: ${decisionSummary}. ` : '') +
      `As the ${role}, you may file a motion for reconsideration within the period allowed by institutional rules. ` +
      `Please contact the DEIU office for the full written decision.`,
      {
        priority: 'urgent',
        complaintId,
        actionUrl: `/case-tracking/${complaintId}`,
        actionLabel: 'View Decision',
        data: { decision, isRespondent }
      }
    );
  }

  /**
   * Comprehensive method to handle all complaint activities
   */
  static async handleComplaintActivity(
    activityType: 
      | 'complaint_created'
      | 'complaint_assigned' 
      | 'status_update'
      | 'new_comment'
      | 'evidence_requested'
      | 'deadline_reminder'
      | 'complaint_escalated'
      | 'action_required'
      | 'complaint_reopened',
    userId: string,
    complaintId: string,
    complaintTitle: string,
    additionalData?: {
      handlerName?: string;
      newStatus?: 'pending' | 'inProgress' | 'resolved' | 'dismissed';
      notes?: string;
      commentBy?: string;
      commentText?: string;
      requestedBy?: string;
      daysRemaining?: number;
      reason?: string;
      actionType?: string;
      instructions?: string;
    }
  ): Promise<string> {
    try {
      switch (activityType) {
        case 'complaint_created':
          return await this.sendComplaintCreatedNotification(userId, complaintId, complaintTitle);
        
        case 'complaint_assigned':
          if (!additionalData?.handlerName) throw new Error('handlerName is required for complaint assignment');
          return await this.sendComplaintAssignedNotification(
            userId, complaintId, complaintTitle, additionalData.handlerName
          );
        
        case 'status_update':
          if (!additionalData?.newStatus) throw new Error('newStatus is required for status update');
          return await this.sendComplaintStatusNotification(
            userId, complaintId, complaintTitle, additionalData.newStatus, additionalData.notes
          );
        
        case 'new_comment':
          if (!additionalData?.commentBy || !additionalData?.commentText) {
            throw new Error('commentBy and commentText are required for comment notifications');
          }
          return await this.sendCommentAddedNotification(
            userId, complaintId, complaintTitle, additionalData.commentBy, additionalData.commentText
          );
        
        case 'evidence_requested':
          return await this.sendEvidenceRequestedNotification(
            userId, complaintId, complaintTitle, additionalData?.requestedBy || 'System', additionalData?.notes
          );
        
        case 'deadline_reminder':
          if (!additionalData?.daysRemaining) throw new Error('daysRemaining is required for deadline reminders');
          return await this.sendDeadlineReminderNotification(
            userId, complaintId, complaintTitle, additionalData.daysRemaining
          );
        
        case 'complaint_escalated':
          return await this.sendComplaintEscalatedNotification(
            userId, complaintId, complaintTitle, additionalData?.reason
          );
        
        case 'action_required':
          if (!additionalData?.actionType) throw new Error('actionType is required for action required notifications');
          return await this.sendActionRequiredNotification(
            userId, complaintId, complaintTitle, additionalData.actionType, additionalData.instructions
          );
        
        case 'complaint_reopened':
          return await this.sendComplaintReopenedNotification(
            userId, complaintId, complaintTitle, additionalData?.reason
          );
        
        default:
          throw new Error(`Unknown activity type: ${activityType}`);
      }
    } catch (error) {
      console.error(`Error handling complaint activity ${activityType}:`, error);
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      priority?: NotificationPriority;
      complaintId?: string;
      messageId?: string;
      chatRoomId?: string;
      actionUrl?: string;
      actionLabel?: string;
      expiresAt?: Date;
      data?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      // Check if user has this notification type enabled
      const preferences = await this.getPreferences(userId);
      if (preferences && !preferences.preferences[type]) {
        console.log(`Notification type ${type} is disabled for user ${userId}`);
        return '';
      }

      // Check quiet hours
      if (preferences?.quietHoursEnabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (
          preferences.quietHoursStart &&
          preferences.quietHoursEnd &&
          this.isInQuietHours(currentTime, preferences.quietHoursStart, preferences.quietHoursEnd)
        ) {
          console.log(`Quiet hours active for user ${userId}, notification deferred`);
          // Could implement deferred notification queue here
          return '';
        }
      }

      // SAFETY CHECK: Prevent internal notes from being sent to complainants
      // new_comment notifications (when marked as internal) should ONLY go to admin/handler users
      if (type === 'new_comment' || options?.data?.isInternalNote) {
        try {
          // Verify recipient is an admin or handler in the representatives collection
          const representativesRef = collection(db, 'representatives');
          const q = query(representativesRef, where('userId', '==', userId));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            console.warn(`⚠️ Blocked case_note notification to non-representative user ${userId}`);
            return ''; // Don't send notification to complainants
          }
          
          const repData = snapshot.docs[0].data();
          const role = repData.role;
          
          if (role !== 'admin' && role !== 'handler') {
            console.warn(`⚠️ Blocked case_note notification to user ${userId} with role: ${role}`);
            return ''; // Only admins and handlers should receive internal notes
          }
          
          console.log(`✅ Verified recipient ${userId} is ${role} - proceeding with case_note notification`);
        } catch (error) {
          console.error('Error verifying recipient role for case_note:', error);
          return ''; // Fail safe - don't send if we can't verify
        }
      }

      // Build notification object WITHOUT undefined fields
      const notificationData: any = {
        userId,
        type,
        priority: options?.priority || 'normal',
        status: 'unread',
        title,
        message,
        createdAt: Timestamp.fromDate(new Date()),
      };

      // Only add fields that have values (not undefined)
      if (options?.complaintId) notificationData.complaintId = options.complaintId;
      if (options?.messageId) notificationData.messageId = options.messageId;
      if (options?.chatRoomId) notificationData.chatRoomId = options.chatRoomId;
      if (options?.actionUrl) notificationData.actionUrl = options.actionUrl;
      if (options?.actionLabel) notificationData.actionLabel = options.actionLabel;
      if (options?.expiresAt) notificationData.expiresAt = Timestamp.fromDate(options.expiresAt);
      if (options?.data) notificationData.data = options.data;

      console.log(`🔔 [DEBUG] Creating notification in collection ${this.notificationsCollection}:`, notificationData);

      const notificationsRef = collection(db, this.notificationsCollection);
      console.log(`🔔 [DEBUG] Collection reference created:`, notificationsRef);
      
      const docRef = await addDoc(notificationsRef, notificationData);
      console.log(`🔔 [DEBUG] Notification created with ID: ${docRef.id}`);
      
      // Verify the document was created
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error('Document was not created successfully');
      }
      console.log(`🔔 [DEBUG] Verified notification creation:`, docSnapshot.data());

      // Send email notification if enabled
      // Fall back to checking users/{uid}.notificationPreference if no preferences doc exists yet
      const emailEnabled = preferences
        ? preferences.emailEnabled && preferences.emailDigest === 'immediate'
        : await (async () => {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              const pref = userDoc.data()?.notificationPreference ?? 'both';
              return pref === 'email' || pref === 'both';
            } catch { return false; }
          })();

      if (emailEnabled && !this.emailSuppressedTypes.has(type)) {
        await this.sendEmailNotification(userId, {
          userId,
          type,
          priority: options?.priority || 'normal',
          status: 'unread',
          title,
          message,
          createdAt: new Date(),
          complaintId: options?.complaintId,
          messageId: options?.messageId,
          chatRoomId: options?.chatRoomId,
          actionUrl: options?.actionUrl,
          actionLabel: options?.actionLabel,
          expiresAt: options?.expiresAt,
          data: options?.data,
        } as Omit<Notification, 'id'>);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    options?: {
      status?: NotificationStatus;
      limit?: number;
      unreadOnly?: boolean;
    }
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, this.notificationsCollection),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (options?.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (options?.unreadOnly) {
        q = query(q, where('status', '==', 'unread'));
      }

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      const notifications: Notification[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          readAt: data.readAt?.toDate(),
          archivedAt: data.archivedAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
        } as Notification);
      });

      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications
   * FIXED: Process entire snapshot instead of only changes to avoid duplicate processing
   */
  static subscribeToNotifications(
    userId: string,
    callback: (
      notifications: Notification[],
      meta?: { fromCache: boolean }
    ) => void,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
    }
  ): Unsubscribe {
    if (!userId) {
      console.error('[NotificationService] No userId provided for subscription');
      callback([]);
      return () => {};
    }

    console.log('[NotificationService] Setting up subscription for user:', userId);
    
    try {
      const notificationsRef = collection(db, this.notificationsCollection);
      console.log('[NotificationService] Collection reference created:', this.notificationsCollection);
      
      let q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (options?.unreadOnly) {
        q = query(q, where('status', '==', 'unread'));
      }

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      // FIX: Process entire snapshot instead of docChanges() to avoid duplicates
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('[NotificationService] Received snapshot, docs:', snapshot.size);
          const notifications: Notification[] = [];
          
          // Process all docs in the snapshot (not just changes)
          snapshot.forEach((doc) => {
            try {
              const data = doc.data();
              const notification = {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                readAt: data.readAt?.toDate(),
                archivedAt: data.archivedAt?.toDate(),
                expiresAt: data.expiresAt?.toDate(),
              } as Notification;
              
              notifications.push(notification);
            } catch (docError) {
              console.error('[NotificationService] Error processing doc:', doc.id, docError);
            }
          });
          
          console.log('[NotificationService] Processed notifications:', notifications.length);
          console.log('[NotificationService] Unread count:', notifications.filter(n => n.status === 'unread').length);
          callback(notifications, { fromCache: snapshot.metadata.fromCache });
        },
        (error) => {
          console.error('[NotificationService] Subscription error:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return () => {};
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.notificationsCollection, notificationId);
      await updateDoc(docRef, {
        status: 'read',
        readAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.notificationsCollection),
        where('userId', '==', userId),
        where('status', '==', 'unread')
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((document) => {
        batch.update(document.ref, {
          status: 'read',
          readAt: Timestamp.fromDate(new Date()),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.notificationsCollection, notificationId);
      await updateDoc(docRef, {
        status: 'archived',
        archivedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.notificationsCollection, notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  static async deleteAllRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.notificationsCollection),
        where('userId', '==', userId),
        where('status', '==', 'read')
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((document) => {
        batch.delete(document.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getStats(userId: string): Promise<NotificationStats> {
    try {
      const notifications = await this.getNotifications(userId);

      const stats: NotificationStats = {
        total: notifications.length,
        unread: 0,
        read: 0,
        archived: 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {
          low: 0,
          normal: 0,
          high: 0,
          urgent: 0,
        },
      };

      notifications.forEach((notification) => {
        // By status
        if (notification.status === 'unread') stats.unread++;
        else if (notification.status === 'read') stats.read++;
        else if (notification.status === 'archived') stats.archived++;

        // By type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

        // By priority
        stats.byPriority[notification.priority]++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Get or create user notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const docRef = doc(db, this.preferencesCollection, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          userId,
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as NotificationPreferences;
      }

      return null;
    } catch (error) {
      console.error('Error getting preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    userId: string,
    emailAddress: string,
    preferences: Partial<Omit<NotificationPreferences, 'userId' | 'emailAddress' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.preferencesCollection, userId);
      const existingPrefs = await this.getPreferences(userId);

      const updatedPreferences = {
        ...(existingPrefs || DEFAULT_NOTIFICATION_PREFERENCES),
        ...preferences,
        userId,
        emailAddress,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      await updateDoc(docRef, updatedPreferences).catch(async () => {
        // Document doesn't exist, create it with the correct ID
        await setDoc(docRef, updatedPreferences);
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Send email notification via EmailJS.
   *
   * Template routing:
   *  - complaint_created  → TEMPLATE_SUBMITTED  (case_id, category, date, to_name)
   *  - everything else    → TEMPLATE_UPDATE      (case_id, status, date, message, to_name)
   *
   * Chat (`new_message`) and read receipts are not emailed — see `emailSuppressedTypes` in createNotification.
   */
  private static async sendEmailNotification(
    userId: string,
    notification: Omit<Notification, 'id'>
  ): Promise<void> {
    try {
      const serviceId         = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateSubmitted = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_SUBMITTED;
      const templateUpdate    = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_UPDATE;
      const publicKey         = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateSubmitted || !templateUpdate || !publicKey) {
        console.warn('[NotificationService] EmailJS env vars not set — skipping email.');
        return;
      }

      // Get user info from Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return;
      const email: string   = userDoc.data().email;
      const toName: string  = userDoc.data().name ?? email;
      if (!email) return;

      const emailjs = await import('@emailjs/browser');
      emailjs.init({ publicKey });
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });

      const isSubmission = notification.type === 'complaint_created';
      const templateId   = isSubmission ? templateSubmitted : templateUpdate;

      // Get formatted Case ID from complaint document
      let formattedCaseId = 'N/A';
      if (notification.complaintId) {
        try {
          const complaintDoc = await getDoc(doc(db, 'complaints', notification.complaintId));
          if (complaintDoc.exists()) {
            formattedCaseId = complaintDoc.data().caseId || notification.complaintId;
          }
        } catch (error) {
          console.warn('Could not fetch complaint caseId, using raw ID:', error);
          formattedCaseId = notification.complaintId;
        }
      }

      const templateParams = isSubmission
        ? {
            // template_2ry6qwe variables
            to_email: email,
            to_name:  toName,
            case_id:  formattedCaseId,
            category: notification.data?.category ?? 'General',
            date:     dateStr,
          }
        : {
            // template_z7sdtfq variables
            to_email: email,
            to_name:  toName,
            case_id:  formattedCaseId,
            status:   notification.data?.newStatus ?? notification.title,
            message:  notification.message,
            date:     dateStr,
          };

      await emailjs.send(serviceId, templateId, templateParams);

      console.log(`[NotificationService] Email (${templateId}) sent to ${email}`);
    } catch (error) {
      console.error('Error sending email notification via EmailJS:', error);
      // Don't throw — email failure shouldn't block notification creation
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private static isInQuietHours(currentTime: string, start: string, end: string): boolean {
    // Simple time comparison (doesn't handle overnight ranges perfectly)
    // For production, use a proper date library
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight range (e.g., 22:00 to 08:00)
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.notificationsCollection),
        where('expiresAt', '<=', Timestamp.fromDate(now))
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((document) => {
        batch.delete(document.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${snapshot.size} expired notifications`);
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }

  /**
   * Get notifications by complaint ID
   */
  static async getNotificationsByComplaint(
    complaintId: string,
    options?: {
      limit?: number;
      type?: NotificationType;
    }
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, this.notificationsCollection),
        where('complaintId', '==', complaintId),
        orderBy('createdAt', 'desc')
      );

      if (options?.type) {
        q = query(q, where('type', '==', options.type));
      }

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      const notifications: Notification[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          readAt: data.readAt?.toDate(),
          archivedAt: data.archivedAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
        } as Notification);
      });

      return notifications;
    } catch (error) {
      console.error('Error getting notifications by complaint:', error);
      throw error;
    }
  }

  /**
   * Bulk create notifications for multiple users
   */
  static async bulkCreateNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      priority?: NotificationPriority;
      complaintId?: string;
      actionUrl?: string;
      actionLabel?: string;
      data?: Record<string, any>;
    }
  ): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const createdIds: string[] = [];

      for (const userId of userIds) {
        const notificationData: any = {
          userId,
          type,
          priority: options?.priority || 'normal',
          status: 'unread',
          title,
          message,
          createdAt: Timestamp.fromDate(new Date()),
        };

        if (options?.complaintId) notificationData.complaintId = options.complaintId;
        if (options?.actionUrl) notificationData.actionUrl = options.actionUrl;
        if (options?.actionLabel) notificationData.actionLabel = options.actionLabel;
        if (options?.data) notificationData.data = options.data;

        const docRef = doc(collection(db, this.notificationsCollection));
        batch.set(docRef, notificationData);
        createdIds.push(docRef.id);
      }

      await batch.commit();
      return createdIds;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }
}
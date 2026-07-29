/**
 * Notification System Types
 * Types for in-app notifications, email notifications, and notification preferences
 */

export type NotificationType =
  // Complaint notifications
  | 'complaint_created'
  | 'complaint_assigned'
  | 'case_assigned'        // For handlers when they get assigned a case
  | 'status_update'
  | 'complaint_resolved'
  | 'complaint_escalated'
  | 'complaint_reopened'
  | 'case_closed'          // Case officially closed and archived
  | 'new_comment'
  | 'evidence_requested'
  | 'deadline_reminder'
  | 'action_required'
  // Message notifications
  | 'new_message'
  | 'message_read'
  // Action notifications
  | 'evidence_uploaded'
  | 'comment_added'
  | 'handler_assigned'
  | 'handler_changed'
  // Deadline notifications
  | 'deadline_approaching'
  | 'deadline_passed'
  // Hearing & decision notifications
  | 'hearing_scheduled'        // Complainant/respondent notified of hearing date
  | 'hearing_reminder'         // Reminder before hearing
  | 'decision_issued'          // Both parties notified of final decision
  | 'respondent_notified'      // Respondent informed of complaint filed against them
  | 'complaint_filed_against_you' // For respondent: complaint filed against them
  // System notifications
  | 'system_announcement'
  | 'maintenance_scheduled'
  | 'account_updated';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  
  title: string;
  message: string;
  
  // Related entities
  complaintId?: string;
  messageId?: string;
  chatRoomId?: string;
  
  // Actions
  actionUrl?: string;
  actionLabel?: string;
  
  // Metadata
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
  
  // Additional data
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  
  // In-app notifications
  inAppEnabled: boolean;

  /** Web push / lock-screen alerts (PWA + FCM) */
  pushEnabled?: boolean;
  
  // Email notifications
  emailEnabled: boolean;
  emailAddress: string;
  
  // Notification type preferences (partial — missing keys default to enabled)
  preferences: Partial<Record<NotificationType, boolean>>;
  
  // Digest settings
  emailDigest: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  digestTime?: string; // HH:mm format
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  
  updatedAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Helper functions

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'complaint_created':
      return '📝';
    case 'complaint_assigned':
      return '👤';
    case 'case_assigned':
      return '📋';
    case 'status_update':
      return '🔄';
    case 'complaint_resolved':
      return '✅';
    case 'complaint_escalated':
      return '📈';
    case 'complaint_reopened':
      return '🔓';
    case 'case_closed':
      return '🔒';
    case 'new_comment':
      return '💬';
    case 'evidence_requested':
      return '📎';
    case 'deadline_reminder':
      return '⏰';
    case 'action_required':
      return '⚠️';
    case 'new_message':
      return '💬';
    case 'message_read':
      return '👁️';
    case 'evidence_uploaded':
      return '📁';
    case 'comment_added':
      return '💭';
    case 'handler_assigned':
      return '👤';
    case 'handler_changed':
      return '🔄';
    case 'deadline_approaching':
      return '⏳';
    case 'deadline_passed':
      return '❌';
    case 'system_announcement':
      return '📢';
    case 'maintenance_scheduled':
      return '🔧';
    case 'account_updated':
      return '⚙️';
    case 'hearing_scheduled':
      return '📅';
    case 'hearing_reminder':
      return '⏰';
    case 'decision_issued':
      return '⚖️';
    case 'respondent_notified':
      return '📬';
    case 'complaint_filed_against_you':
      return '⚠️';
    default:
      return '🔔';
  }
}

export function getNotificationColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'low':
      return 'text-gray-600 bg-gray-50';
    case 'normal':
      return 'text-blue-600 bg-blue-50';
    case 'high':
      return 'text-orange-600 bg-orange-50';
    case 'urgent':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getNotificationBadgeColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'low':
      return 'bg-gray-100 text-gray-800';
    case 'normal':
      return 'bg-blue-100 text-blue-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'urgent':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/** Default on/off per notification type — used when user prefs omit a type */
export const DEFAULT_TYPE_PREFERENCES: Record<NotificationType, boolean> = {
  complaint_created: true,
  complaint_assigned: true,
  case_assigned: true,
  status_update: true,
  complaint_resolved: true,
  complaint_escalated: true,
  complaint_reopened: true,
  case_closed: true,
  new_comment: true,
  evidence_requested: true,
  deadline_reminder: true,
  action_required: true,
  new_message: true,
  message_read: false,
  evidence_uploaded: true,
  comment_added: true,
  handler_assigned: true,
  handler_changed: true,
  deadline_approaching: true,
  deadline_passed: true,
  hearing_scheduled: true,
  hearing_reminder: true,
  decision_issued: true,
  respondent_notified: true,
  complaint_filed_against_you: true,
  system_announcement: true,
  maintenance_scheduled: true,
  account_updated: true,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'emailAddress' | 'updatedAt'> = {
  inAppEnabled: true,
  pushEnabled: true,
  emailEnabled: true,
  preferences: { ...DEFAULT_TYPE_PREFERENCES },
  emailDigest: 'immediate',
  digestTime: '09:00',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

/** Returns whether a notification type should be delivered (defaults to enabled). */
export function isNotificationTypeEnabled(
  type: NotificationType,
  preferences: NotificationPreferences | null
): boolean {
  if (!preferences) return true;
  const explicit = preferences.preferences?.[type];
  if (explicit !== undefined) return explicit;
  return DEFAULT_TYPE_PREFERENCES[type] ?? true;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  complaint_created: 'Complaint Created',
  complaint_assigned: 'Complaint Assigned',
  case_assigned: 'Case Assigned',
  status_update: 'Status Updated',
  complaint_resolved: 'Complaint Resolved',
  complaint_escalated: 'Complaint Escalated',
  complaint_reopened: 'Complaint Reopened',
  case_closed: 'Case Closed',
  new_comment: 'New Comment',
  evidence_requested: 'Evidence Requested',
  deadline_reminder: 'Deadline Reminder',
  action_required: 'Action Required',
  new_message: 'New Message',
  message_read: 'Message Read',
  evidence_uploaded: 'Evidence Uploaded',
  comment_added: 'Comment Added',
  handler_assigned: 'Handler Assigned',
  handler_changed: 'Handler Changed',
  deadline_approaching: 'Deadline Approaching',
  deadline_passed: 'Deadline Passed',
  system_announcement: 'System Announcement',
  maintenance_scheduled: 'Maintenance Scheduled',
  account_updated: 'Account Updated',
  hearing_scheduled: 'Hearing Scheduled',
  hearing_reminder: 'Hearing Reminder',
  decision_issued: 'Decision Issued',
  respondent_notified: 'Respondent Notified',
  complaint_filed_against_you: 'Complaint Filed Against You',
};
/**
 * Activity Log Types
 * Tracks all actions taken by users in the system
 */

import { Timestamp } from 'firebase/firestore';

// Action types for different activities
export type ActivityAction = 
  // Complaint actions
  | 'complaint_created'
  | 'complaint_viewed'
  | 'complaint_updated'
  | 'complaint_status_changed'
  | 'complaint_assigned'
  | 'complaint_reassigned'
  | 'complaint_escalated'
  | 'complaint_resolved'
  | 'complaint_dismissed'
  | 'complaint_reopened'
  
  // Handler actions
  | 'handler_assigned'
  | 'handler_removed'
  | 'handler_note_added'
  | 'handler_timeline_updated'
  
  // Escalation actions
  | 'escalation_auto'
  | 'escalation_manual'
  | 'escalation_deescalated'
  
  // Message actions
  | 'message_sent'
  | 'message_read'
  | 'chat_opened'
  | 'chat_closed'
  
  // Evidence actions
  | 'evidence_uploaded'
  | 'evidence_viewed'
  | 'evidence_deleted'
  | 'affidavit_uploaded'
  
  // User actions
  | 'user_created'
  | 'user_updated'
  | 'user_login'
  | 'user_logout'
  
  // Admin actions
  | 'admin_login'
  | 'admin_action'
  | 'settings_changed'
  | 'representative_added'
  | 'representative_removed';

// Log severity levels
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

// Activity log entry
export interface ActivityLog {
  id: string;
  timestamp: Date;
  action: ActivityAction;
  userId: string;
  userName: string;
  userRole?: string;
  
  // Related entities
  complaintId?: string;
  complaintTitle?: string;
  targetUserId?: string;
  targetUserName?: string;
  
  // Action details
  description: string;
  details?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  // Metadata
  severity: LogSeverity;
  category: string;
  ipAddress?: string;
  userAgent?: string;
  
  // System info
  success: boolean;
  errorMessage?: string;
  duration?: number; // in milliseconds
}

// Activity log filters
export interface ActivityLogFilters {
  startDate?: Date;
  endDate?: Date;
  actions?: ActivityAction[];
  userIds?: string[];
  complaintIds?: string[];
  severity?: LogSeverity[];
  category?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// Activity log statistics
export interface ActivityLogStats {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  logsThisMonth: number;
  
  byAction: Record<ActivityAction, number>;
  byUser: Record<string, number>;
  bySeverity: Record<LogSeverity, number>;
  byCategory: Record<string, number>;
  
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  
  mostFrequentActions: Array<{
    action: ActivityAction;
    count: number;
  }>;
  
  errorRate: number;
  averageDuration?: number;
}

// Activity log export options
export interface ActivityLogExportOptions {
  format: 'csv' | 'json' | 'pdf';
  filters?: ActivityLogFilters;
  includeDetails?: boolean;
  includeChanges?: boolean;
}

// Helper: Activity action labels
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  // Complaint actions
  complaint_created: 'Complaint Created',
  complaint_viewed: 'Complaint Viewed',
  complaint_updated: 'Complaint Updated',
  complaint_status_changed: 'Status Changed',
  complaint_assigned: 'Case Taken',
  complaint_reassigned: 'Complaint Reassigned',
  complaint_escalated: 'Complaint Escalated',
  complaint_resolved: 'Complaint Resolved',
  complaint_dismissed: 'Complaint Dismissed',
  complaint_reopened: 'Complaint Reopened',
  
  // Handler actions
  handler_assigned: 'Case Taken',
  handler_removed: 'Handler Removed',
  handler_note_added: 'Note Added',
  handler_timeline_updated: 'Timeline Updated',
  
  // Escalation actions
  escalation_auto: 'Auto Escalated',
  escalation_manual: 'Manually Escalated',
  escalation_deescalated: 'De-escalated',
  
  // Message actions
  message_sent: 'Message Sent',
  message_read: 'Message Read',
  chat_opened: 'Chat Opened',
  chat_closed: 'Chat Closed',
  
  // Evidence actions
  evidence_uploaded: 'Evidence Uploaded',
  evidence_viewed: 'Evidence Viewed',
  evidence_deleted: 'Evidence Deleted',
  affidavit_uploaded: 'Affidavit Uploaded',
  
  // User actions
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_login: 'User Login',
  user_logout: 'User Logout',
  
  // Admin actions
  admin_login: 'Admin Login',
  admin_action: 'Admin Action',
  settings_changed: 'Settings Changed',
  representative_added: 'Representative Added',
  representative_removed: 'Representative Removed',
};

// Helper: Activity categories
export const ACTIVITY_CATEGORIES = [
  'complaint',
  'handler',
  'escalation',
  'message',
  'evidence',
  'user',
  'admin',
  'system',
] as const;

export type ActivityCategory = typeof ACTIVITY_CATEGORIES[number];

// Helper: Get category from action
export const getActivityCategory = (action: ActivityAction): ActivityCategory => {
  if (action.startsWith('complaint_')) return 'complaint';
  if (action.startsWith('handler_')) return 'handler';
  if (action.startsWith('escalation_')) return 'escalation';
  if (action.startsWith('message_') || action.startsWith('chat_')) return 'message';
  if (action.startsWith('evidence_') || action.startsWith('affidavit_')) return 'evidence';
  if (action.startsWith('user_')) return 'user';
  if (action.startsWith('admin_') || action.startsWith('representative_') || action.startsWith('settings_')) return 'admin';
  return 'system';
};

// Helper: Get severity color
export const getActivitySeverityColor = (severity: LogSeverity): string => {
  switch (severity) {
    case 'info': return 'text-blue-600 bg-blue-50';
    case 'warning': return 'text-yellow-600 bg-yellow-50';
    case 'error': return 'text-red-600 bg-red-50';
    case 'critical': return 'text-purple-600 bg-purple-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

// Helper: Get category color
export const getActivityCategoryColor = (category: ActivityCategory): string => {
  switch (category) {
    case 'complaint': return 'text-indigo-600 bg-indigo-50';
    case 'handler': return 'text-green-600 bg-green-50';
    case 'escalation': return 'text-orange-600 bg-orange-50';
    case 'message': return 'text-blue-600 bg-blue-50';
    case 'evidence': return 'text-purple-600 bg-purple-50';
    case 'user': return 'text-teal-600 bg-teal-50';
    case 'admin': return 'text-red-600 bg-red-50';
    case 'system': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

// Helper: Format duration
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Helper: Create activity log entry
export const createActivityLogEntry = (
  action: ActivityAction,
  userId: string,
  userName: string,
  description: string,
  options?: {
    userRole?: string;
    complaintId?: string;
    complaintTitle?: string;
    targetUserId?: string;
    targetUserName?: string;
    details?: Record<string, any>;
    changes?: ActivityLog['changes'];
    severity?: LogSeverity;
    success?: boolean;
    errorMessage?: string;
    duration?: number;
  }
): Omit<ActivityLog, 'id' | 'timestamp'> => {
  const category = getActivityCategory(action);
  
  return {
    action,
    userId,
    userName,
    userRole: options?.userRole,
    complaintId: options?.complaintId,
    complaintTitle: options?.complaintTitle,
    targetUserId: options?.targetUserId,
    targetUserName: options?.targetUserName,
    description,
    details: options?.details,
    changes: options?.changes,
    severity: options?.severity || 'info',
    category,
    success: options?.success !== false,
    errorMessage: options?.errorMessage,
    duration: options?.duration,
  };
};

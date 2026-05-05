/**
 * Activity Log Service
 * Handles logging, retrieval, and analysis of user activities
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  startAfter,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ActivityLog,
  ActivityLogFilters,
  ActivityLogStats,
  ActivityLogExportOptions,
  ActivityAction,
  LogSeverity,
  createActivityLogEntry,
  ACTIVITY_ACTION_LABELS,
} from '../types/activityLog';
import { format, startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';

const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

export class ActivityLogService {
  /**
   * Log an activity
   */
  static async logActivity(
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
  ): Promise<string> {
    try {
      const logEntry = createActivityLogEntry(
        action,
        userId,
        userName,
        description,
        options
      );

      const docRef = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
        ...logEntry,
        timestamp: Timestamp.now(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
      });

      console.log('✅ Activity logged:', action, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Get activity logs with filters
   */
  static async getActivityLogs(
    filters?: ActivityLogFilters
  ): Promise<ActivityLog[]> {
    try {
      let q: Query<DocumentData> = collection(db, ACTIVITY_LOGS_COLLECTION);

      // Apply filters
      const constraints: any[] = [];

      // Date range
      if (filters?.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      // Actions
      if (filters?.actions && filters.actions.length > 0) {
        constraints.push(where('action', 'in', filters.actions.slice(0, 10))); // Firestore limit
      }

      // User IDs
      if (filters?.userIds && filters.userIds.length > 0) {
        constraints.push(where('userId', 'in', filters.userIds.slice(0, 10)));
      }

      // Complaint IDs
      if (filters?.complaintIds && filters.complaintIds.length > 0) {
        constraints.push(where('complaintId', 'in', filters.complaintIds.slice(0, 10)));
      }

      // Severity
      if (filters?.severity && filters.severity.length > 0) {
        constraints.push(where('severity', 'in', filters.severity.slice(0, 10)));
      }

      // Category
      if (filters?.category && filters.category.length > 0) {
        constraints.push(where('category', 'in', filters.category.slice(0, 10)));
      }

      // Order by timestamp descending
      constraints.push(orderBy('timestamp', 'desc'));

      // Limit
      if (filters?.limit) {
        constraints.push(limit(filters.limit));
      }

      q = query(q, ...constraints);

      const snapshot = await getDocs(q);
      const logs: ActivityLog[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as ActivityLog;
      });

      // Client-side search filter (if provided)
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return logs.filter(
          (log) =>
            log.description.toLowerCase().includes(searchLower) ||
            log.userName.toLowerCase().includes(searchLower) ||
            log.complaintTitle?.toLowerCase().includes(searchLower) ||
            ACTIVITY_ACTION_LABELS[log.action].toLowerCase().includes(searchLower)
        );
      }

      return logs;
    } catch (error) {
      console.error('❌ Error fetching activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity log statistics
   */
  static async getActivityStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityLogStats> {
    try {
      const now = new Date();
      const filters: ActivityLogFilters = {
        startDate: startDate || subMonths(now, 1),
        endDate: endDate || now,
      };

      const logs = await this.getActivityLogs(filters);
      
      // Get logs for different time ranges
      const logsToday = logs.filter(
        (log) => log.timestamp >= startOfDay(now) && log.timestamp <= endOfDay(now)
      );
      const logsThisWeek = logs.filter((log) => log.timestamp >= subWeeks(now, 1));
      const logsThisMonth = logs.filter((log) => log.timestamp >= subMonths(now, 1));

      // By action
      const byAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<ActivityAction, number>);

      // By user
      const byUser = logs.reduce((acc, log) => {
        acc[log.userId] = (acc[log.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // By severity
      const bySeverity = logs.reduce((acc, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      }, {} as Record<LogSeverity, number>);

      // By category
      const byCategory = logs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Most active users
      const userCounts = new Map<string, { userName: string; count: number }>();
      logs.forEach((log) => {
        const existing = userCounts.get(log.userId) || { userName: log.userName, count: 0 };
        userCounts.set(log.userId, {
          userName: log.userName,
          count: existing.count + 1,
        });
      });

      const mostActiveUsers = Array.from(userCounts.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.userName,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Most frequent actions
      const mostFrequentActions = Object.entries(byAction)
        .map(([action, count]) => ({
          action: action as ActivityAction,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Error rate
      const totalLogs = logs.length;
      const failedLogs = logs.filter((log) => !log.success).length;
      const errorRate = totalLogs > 0 ? (failedLogs / totalLogs) * 100 : 0;

      // Average duration
      const logsWithDuration = logs.filter((log) => log.duration !== undefined);
      const averageDuration =
        logsWithDuration.length > 0
          ? logsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) /
            logsWithDuration.length
          : undefined;

      return {
        totalLogs: logs.length,
        logsToday: logsToday.length,
        logsThisWeek: logsThisWeek.length,
        logsThisMonth: logsThisMonth.length,
        byAction,
        byUser,
        bySeverity,
        byCategory,
        mostActiveUsers,
        mostFrequentActions,
        errorRate,
        averageDuration,
      };
    } catch (error) {
      console.error('❌ Error calculating activity stats:', error);
      throw error;
    }
  }

  /**
   * Get logs for a specific complaint
   */
  static async getComplaintLogs(complaintId: string): Promise<ActivityLog[]> {
    return this.getActivityLogs({
      complaintIds: [complaintId],
    });
  }

  /**
   * Get logs for a specific user
   */
  static async getUserLogs(userId: string, limit?: number): Promise<ActivityLog[]> {
    return this.getActivityLogs({
      userIds: [userId],
      limit,
    });
  }

  /**
   * Export activity logs
   */
  static async exportLogs(
    options: ActivityLogExportOptions
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const logs = await this.getActivityLogs(options.filters);

    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

    switch (options.format) {
      case 'csv':
        return this.exportToCSV(logs, timestamp, options);
      case 'json':
        return this.exportToJSON(logs, timestamp, options);
      case 'pdf':
        return this.exportToPDF(logs, timestamp, options);
      default:
        throw new Error('Invalid export format');
    }
  }

  /**
   * Export logs to CSV
   */
  private static exportToCSV(
    logs: ActivityLog[],
    timestamp: string,
    options: ActivityLogExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const headers = [
      'Timestamp',
      'Action',
      'User',
      'Role',
      'Description',
      'Complaint ID',
      'Severity',
      'Category',
      'Success',
    ];

    if (options.includeDetails) {
      headers.push('Details');
    }

    const rows = logs.map((log) => {
      const row = [
        format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        ACTIVITY_ACTION_LABELS[log.action],
        log.userName,
        log.userRole || 'N/A',
        `"${log.description.replace(/"/g, '""')}"`,
        log.complaintId || 'N/A',
        log.severity,
        log.category,
        log.success ? 'Yes' : 'No',
      ];

      if (options.includeDetails && log.details) {
        row.push(`"${JSON.stringify(log.details).replace(/"/g, '""')}"`);
      }

      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return {
      data: csv,
      filename: `activity-logs_${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  }

  /**
   * Export logs to JSON
   */
  private static exportToJSON(
    logs: ActivityLog[],
    timestamp: string,
    options: ActivityLogExportOptions
  ): { data: string; filename: string; mimeType: string } {
    const exportData = logs.map((log) => {
      const data: any = {
        timestamp: format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        action: ACTIVITY_ACTION_LABELS[log.action],
        actionKey: log.action,
        user: {
          id: log.userId,
          name: log.userName,
          role: log.userRole,
        },
        description: log.description,
        severity: log.severity,
        category: log.category,
        success: log.success,
      };

      if (log.complaintId) {
        data.complaint = {
          id: log.complaintId,
          title: log.complaintTitle,
        };
      }

      if (options.includeDetails && log.details) {
        data.details = log.details;
      }

      if (options.includeChanges && log.changes) {
        data.changes = log.changes;
      }

      if (log.errorMessage) {
        data.error = log.errorMessage;
      }

      if (log.duration) {
        data.duration = log.duration;
      }

      return data;
    });

    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `activity-logs_${timestamp}.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * Export logs to PDF (placeholder - requires jsPDF integration)
   */
  private static exportToPDF(
    logs: ActivityLog[],
    timestamp: string,
    options: ActivityLogExportOptions
  ): { data: string; filename: string; mimeType: string } {
    // For now, return JSON format
    // TODO: Implement proper PDF generation with jsPDF
    return this.exportToJSON(logs, timestamp, options);
  }

  /**
   * Get client IP (placeholder - requires server-side implementation)
   */
  private static async getClientIP(): Promise<string | undefined> {
    try {
      // In production, this should be obtained from server-side
      // For now, return undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Clean up old logs (for maintenance)
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = subDays(new Date(), daysToKeep);
      const logs = await this.getActivityLogs({
        endDate: cutoffDate,
      });

      // Note: Firestore doesn't support batch deletes in client SDK
      // This should be implemented as a Cloud Function
      console.log(`Found ${logs.length} logs older than ${daysToKeep} days`);
      return logs.length;
    } catch (error) {
      console.error('❌ Error cleaning up logs:', error);
      throw error;
    }
  }
}

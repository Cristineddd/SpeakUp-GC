import type { AdminReport } from '../services/adminReportService';
import {
  getFormalComplaintCategoryLabel,
  normalizeFormalComplaintCategory,
} from '../constants/formalComplaintCategories';
import { safeToDate } from './dateFormat';
import { RESPONSE_DEADLINE_DAYS } from './caseDeadlines';

export type FilingIdentity = 'anonymous' | 'identified';

export interface ComplianceReportRecord extends AdminReport {
  isAnonymous?: boolean;
  anonymityLevel?: string;
  complainantName?: string;
  complainantType?: string;
  isDeleted?: boolean;
  createdAt?: string;
  filingDate?: unknown;
}

const ANONYMOUS_EMAIL = 'anonymous@speakupgc.com';

export function isAnonymousComplaint(report: ComplianceReportRecord): boolean {
  if (report.isAnonymous === true) return true;
  if (report.anonymityLevel === 'full') return true;

  const name = (report.complainantName || report.userName || '').trim().toLowerCase();
  if (name === 'anonymous') return true;

  const email = (report.userEmail || '').trim().toLowerCase();
  if (email === ANONYMOUS_EMAIL) return true;

  return false;
}

export function getFilingIdentity(report: ComplianceReportRecord): FilingIdentity {
  return isAnonymousComplaint(report) ? 'anonymous' : 'identified';
}

export function getComplainantTypeLabel(type?: string): string {
  switch (type) {
    case 'student':
      return 'Student';
    case 'faculty':
      return 'Faculty';
    case 'staff':
      return 'Staff';
    case 'other':
      return 'Other';
    default:
      return 'Not specified';
  }
}

export function getCanonicalCategory(report: Pick<AdminReport, 'category' | 'type'>): string {
  const raw = report.category || report.type || 'other';
  return normalizeFormalComplaintCategory(raw) || 'other';
}

export function getCategoryLabel(category?: string): string {
  if (!category) return 'Other';
  return getFormalComplaintCategoryLabel(normalizeFormalComplaintCategory(category) || category);
}

export function getCanonicalSeverity(
  report: Pick<AdminReport, 'severity' | 'harassmentDegree'>
): string {
  const degree = String(report.harassmentDegree || '').toLowerCase();
  if (degree === 'light') return 'low';
  if (degree === 'severe') return 'high';
  if (degree === 'grave') return 'critical';

  const severity = String(report.severity || '').toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(severity)) return severity;
  return 'unspecified';
}

export function getSeverityLabel(severity?: string): string {
  if (!severity || severity === 'unspecified') return 'Unspecified';
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function getCaseLocation(report: AdminReport): string {
  const location = (report.location || report.mapAddress || '').trim();
  if (location) return location;
  if (report.locationVicinity === 'inside') return 'On campus';
  if (report.locationVicinity === 'outside') return 'Off campus';
  return 'Not specified';
}

export function isPendingStatus(status?: string): boolean {
  return status === 'pending' || status === 'submitted';
}

export function isInProgressStatus(status?: string): boolean {
  return status === 'inProgress' || status === 'investigating' || status === 'under_review';
}

export function isResolvedStatus(status?: string): boolean {
  return status === 'resolved';
}

export function isDismissedStatus(status?: string): boolean {
  return status === 'dismissed' || status === 'closed';
}

export function getFiledAt(report: AdminReport): Date | null {
  const record = report as ComplianceReportRecord;
  return (
    safeToDate(report.reportedAt) ||
    safeToDate(record.createdAt) ||
    safeToDate(record.filingDate)
  );
}

export function getResolvedAt(report: AdminReport): Date | null {
  if (!isResolvedStatus(report.status) && !isDismissedStatus(report.status)) {
    return null;
  }

  const completed = safeToDate(report.processingCompletedAt);
  if (completed) return completed;

  const history = [...(report.statusHistory || [])].reverse();
  const resolvedEntry = history.find(
    (entry) => isResolvedStatus(entry.status) || isDismissedStatus(entry.status)
  );
  const fromHistory = safeToDate(resolvedEntry?.updatedAt);
  if (fromHistory) return fromHistory;

  const filed = getFiledAt(report);
  if (filed && typeof report.timeToResolution === 'number' && report.timeToResolution > 0) {
    return new Date(filed.getTime() + report.timeToResolution * 60 * 60 * 1000);
  }

  return safeToDate(report.lastUpdated);
}

export function getFirstResponseAt(report: AdminReport): Date | null {
  const assigned = safeToDate(report.assignedAt);
  if (assigned) return assigned;

  const processingStarted = safeToDate(report.processingStartedAt);
  if (processingStarted) return processingStarted;

  const firstAction = (report.statusHistory || []).find(
    (entry) => entry.status && !isPendingStatus(entry.status)
  );
  return safeToDate(firstAction?.updatedAt);
}

export function getResolutionHours(report: AdminReport): number | null {
  if (typeof report.timeToResolution === 'number' && report.timeToResolution > 0) {
    return report.timeToResolution;
  }
  const filed = getFiledAt(report);
  const resolved = getResolvedAt(report);
  if (!filed || !resolved) return null;
  const hours = (resolved.getTime() - filed.getTime()) / (1000 * 60 * 60);
  return hours >= 0 ? hours : null;
}

export function formatDurationHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return '—';
  if (hours < 24) {
    return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hrs`;
  }
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)} days`;
}

export const RESPONSE_SLA_HOURS = RESPONSE_DEADLINE_DAYS * 24;
export const RESPONSE_SLA_LABEL = `${RESPONSE_DEADLINE_DAYS}-day first-response window`;

export function countByField<T extends string>(
  items: T[],
  total: number
): Array<{ label: string; count: number; percentage: number }> {
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

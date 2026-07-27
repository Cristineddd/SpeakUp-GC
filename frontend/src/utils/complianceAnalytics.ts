import type { AdminReport } from '../services/adminReportService';
import { getFormalComplaintCategoryLabel } from '../constants/formalComplaintCategories';

export type FilingIdentity = 'anonymous' | 'identified';

export interface ComplianceReportRecord extends AdminReport {
  isAnonymous?: boolean;
  anonymityLevel?: string;
  complainantName?: string;
  complainantType?: string;
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

export function getCategoryLabel(category?: string): string {
  if (!category) return 'Other';
  return getFormalComplaintCategoryLabel(category);
}

export function getSeverityLabel(severity?: string): string {
  if (!severity) return 'Unknown';
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

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

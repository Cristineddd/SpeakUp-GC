import { addDays } from 'date-fns';

/** First CODI response window, counted from the filing date. Stored on each complaint as responseDueAt. */
export const RESPONSE_DEADLINE_DAYS = 7;

export function computeResponseDueAt(filedAt: Date): Date {
  return addDays(filedAt, RESPONSE_DEADLINE_DAYS);
}

export function toFirestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  const parsed = new Date(value as string | number);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveResponseDueAt(complaint: {
  responseDueAt?: unknown;
  responseDeadline?: unknown;
  createdAt?: unknown;
  reportedAt?: unknown;
  filingDate?: unknown;
}): Date | null {
  const stored =
    toFirestoreDate(complaint.responseDueAt) || toFirestoreDate(complaint.responseDeadline);
  if (stored) return stored;

  const filedAt =
    toFirestoreDate(complaint.createdAt) ||
    toFirestoreDate(complaint.reportedAt) ||
    toFirestoreDate(complaint.filingDate);
  if (!filedAt) return null;
  return computeResponseDueAt(filedAt);
}

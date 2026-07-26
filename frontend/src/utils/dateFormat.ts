import { format } from 'date-fns';

export function safeToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatDisplayDate(
  value: unknown,
  fallback = 'Not specified',
  pattern = 'MMM d, yyyy'
): string {
  const date = safeToDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
}

export function formatDisplayDateTime(
  value: unknown,
  fallback = 'Not specified',
  pattern = 'MMM d, yyyy · h:mm a'
): string {
  const date = safeToDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
}

export function formatSeverityLabel(severity?: string): string {
  if (!severity) return 'Unknown';
  return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
}

import { safeToDate } from '../utils/dateFormat';

/**
 * Categories for formal complaints (SpeakUp GC / DEIU).
 * Keep in sync with the "Type of complaint" field on the formal filing form.
 */
export const FORMAL_COMPLAINT_CATEGORIES = [
  { value: 'sexual_harassment', label: 'Sexual Harassment' },
  { value: 'gender_based_harassment', label: 'Gender-Based Harassment' },
  { value: 'discrimination', label: 'Gender-Based Discrimination' },
  { value: 'bullying', label: 'Bullying/Harassment' },
  { value: 'online_harassment', label: 'Online Sexual Harassment' },
  { value: 'other', label: 'Other' },
] as const;

export type FormalComplaintCategoryValue = (typeof FORMAL_COMPLAINT_CATEGORIES)[number]['value'];

export function getFormalComplaintCategoryLabel(value: string): string {
  const row = FORMAL_COMPLAINT_CATEGORIES.find((c) => c.value === value);
  if (row) return row.label;
  return value.replace(/_/g, ' ');
}

/** Map stored labels or legacy values to canonical category values. */
export function normalizeFormalComplaintCategory(value: string): string {
  if (!value) return '';

  const byValue = FORMAL_COMPLAINT_CATEGORIES.find((c) => c.value === value);
  if (byValue) return byValue.value;

  const byLabel = FORMAL_COMPLAINT_CATEGORIES.find(
    (c) => c.label.toLowerCase() === value.toLowerCase()
  );
  if (byLabel) return byLabel.value;

  const snake = value.toLowerCase().replace(/\s+/g, '_');
  const bySnake = FORMAL_COMPLAINT_CATEGORIES.find((c) => c.value === snake);
  if (bySnake) return bySnake.value;

  return value;
}

/** Regenerate case title after reclassification (matches formal filing form). */
export function buildComplaintTitle(
  category: string,
  incidentDate?: string | Date | null,
  otherDetail?: string
): string {
  const normalized = normalizeFormalComplaintCategory(category);
  const label = getFormalComplaintCategoryLabel(normalized);

  let datePart = 'Incident Report';
  const parsedDate =
    incidentDate instanceof Date ? incidentDate : safeToDate(incidentDate ?? null);
  if (parsedDate) {
    datePart = parsedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  if (normalized === 'other' && otherDetail?.trim()) {
    return `${otherDetail.trim()} - ${datePart}`;
  }

  return `${label} - ${datePart}`;
}

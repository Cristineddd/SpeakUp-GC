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

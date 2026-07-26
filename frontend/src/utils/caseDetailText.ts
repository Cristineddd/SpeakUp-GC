export function normalizeCaseText(value?: string | null): string {
  if (!value || value === 'N/A') return '';
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Returns true when two case text fields carry the same (or largely overlapping) content.
 * Used to avoid showing duplicate blocks such as respondent description vs incident description.
 */
export function isDuplicateCaseText(
  a?: string | null,
  b?: string | null,
  minOverlapLength = 16
): boolean {
  const left = normalizeCaseText(a);
  const right = normalizeCaseText(b);

  if (!left || !right) return false;
  if (left === right) return true;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;

  if (shorter.length < minOverlapLength) return false;

  return longer.includes(shorter);
}

export function shouldShowCaseTextField(
  value?: string | null,
  ...existingValues: (string | null | undefined)[]
): boolean {
  const normalized = normalizeCaseText(value);
  if (!normalized) return false;

  return !existingValues.some((existing) => isDuplicateCaseText(normalized, existing));
}

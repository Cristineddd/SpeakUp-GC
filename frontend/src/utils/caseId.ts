/**
 * Case ID helpers — human-readable case numbers for UI display.
 */

export function formatCaseIdFromFirestore(firestoreId: string): string {
  const hashPart = firestoreId.substring(0, 8).toUpperCase();
  const numericValue = parseInt(hashPart, 36) % 100000;
  const paddedNumber = String(numericValue).padStart(5, '0');
  return `CASE${paddedNumber}`;
}

function extractSequenceNumber(caseId?: string, firestoreId?: string): string | null {
  if (caseId) {
    const match = caseId.match(/(\d+)/);
    if (match) return match[1].padStart(4, '0').slice(-4);
  }
  if (firestoreId) {
    const generated = formatCaseIdFromFirestore(firestoreId);
    const match = generated.match(/(\d+)/);
    if (match) return match[1].padStart(4, '0').slice(-4);
  }
  return null;
}

function resolveFiledYear(filedAt?: string | Date | null): number {
  if (filedAt) {
    const date = filedAt instanceof Date ? filedAt : new Date(filedAt);
    if (!isNaN(date.getTime())) return date.getFullYear();
  }
  return new Date().getFullYear();
}

/** Display format: CASE-2026-0143 */
export function getDisplayCaseNumber(options: {
  caseId?: string;
  firestoreId?: string;
  filedAt?: string | Date | null;
}): string {
  const sequence = extractSequenceNumber(options.caseId, options.firestoreId);
  if (!sequence) return 'N/A';
  const year = resolveFiledYear(options.filedAt);
  return `CASE-${year}-${sequence}`;
}

/** Short internal reference from Firestore ID (first 8 chars). */
export function getInternalCaseRef(firestoreId?: string): string | null {
  if (!firestoreId) return null;
  return firestoreId.slice(0, 8).toUpperCase();
}

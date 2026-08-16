/** Case types where handler identity should not be exposed to the complainant. */
const SENSITIVE_CASE_TYPES = new Set([
  'sexual_harassment',
  'gender_based_sexual_harassment',
  'gbvh',
  'gbv',
]);

export function isSensitiveCaseType(type?: string | null): boolean {
  if (!type) return false;
  return SENSITIVE_CASE_TYPES.has(type.toLowerCase());
}

/** Generic label shown to complainants for sensitive cases instead of handler name/ID. */
export const GENERIC_HANDLER_ASSIGNED_MESSAGE =
  'A CODI member has taken your case';

export function getComplainantHandlerLabel(
  type: string | undefined,
  assigned: boolean,
  assignedToName?: string
): string {
  if (!assigned) return 'Waiting for a CODI member';
  if (isSensitiveCaseType(type)) return GENERIC_HANDLER_ASSIGNED_MESSAGE;
  return assignedToName || 'Case taken by a CODI member';
}

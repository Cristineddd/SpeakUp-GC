import { isSensitiveCaseType } from './sensitiveCaseTypes';

export const CODI_MEMBER_FALLBACK = 'CODI Member';

export function isStaffMessageRole(role?: string): boolean {
  return role === 'handler' || role === 'codi' || role === 'admin';
}

/** Formal/public CODI label shown to complainants (representative displayName, not auth name). */
export function getComplainantFacingHandlerName(options: {
  assignedToName?: string | null;
  chatHandlerName?: string | null;
  category?: string | null;
}): string {
  const formalName =
    options.assignedToName?.trim() || options.chatHandlerName?.trim() || '';

  if (formalName) {
    return formalName;
  }

  if (isSensitiveCaseType(options.category)) {
    return CODI_MEMBER_FALLBACK;
  }

  return CODI_MEMBER_FALLBACK;
}

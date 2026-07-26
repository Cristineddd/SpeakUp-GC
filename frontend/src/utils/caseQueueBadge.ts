export const CASE_SEEN_EVENT = 'speakup:case-seen';

export interface QueueCaseData {
  status?: string;
  assignedTo?: string;
}

export interface QueueBadgeOptions {
  isCODI: boolean;
  representativeId: string | null;
}

const storageKey = (userId: string) => `speakup_seen_cases_${userId}`;

export function getSeenCaseIds(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markCaseSeen(userId: string, caseId: string): void {
  if (typeof window === 'undefined' || !caseId) return;

  const seen = getSeenCaseIds(userId);
  if (seen.has(caseId)) return;

  seen.add(caseId);
  localStorage.setItem(storageKey(userId), JSON.stringify([...seen]));
  window.dispatchEvent(new CustomEvent(CASE_SEEN_EVENT, { detail: { userId, caseId } }));
}

export function isActionableQueueCase(
  data: QueueCaseData,
  options: QueueBadgeOptions
): boolean {
  const activeStatuses = new Set(['pending', 'submitted', 'inProgress']);
  const status = String(data.status || '');

  if (!activeStatuses.has(status)) return false;

  if (options.isCODI) {
    if (!options.representativeId) return false;
    const assignedTo = data.assignedTo;
    return !assignedTo || assignedTo === options.representativeId;
  }

  return true;
}

export function isUnseenActionableCase(
  caseId: string,
  data: QueueCaseData,
  userId: string,
  options: QueueBadgeOptions
): boolean {
  if (!isActionableQueueCase(data, options)) return false;
  return !getSeenCaseIds(userId).has(caseId);
}

export function countUnseenActionableCases(
  cases: Array<{ id: string } & QueueCaseData>,
  userId: string,
  options: QueueBadgeOptions
): number {
  return cases.filter((item) => isUnseenActionableCase(item.id, item, userId, options)).length;
}

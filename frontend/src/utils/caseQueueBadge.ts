import { fetchSeenCaseIds, persistCaseView } from '../services/caseViewService';

export const CASE_SEEN_EVENT = 'speakup:case-seen';
export const CASE_SEEN_HYDRATED_EVENT = 'speakup:case-seen-hydrated';

export interface QueueCaseData {
  status?: string;
  assignedTo?: string;
}

export interface QueueBadgeOptions {
  isCODI: boolean;
  representativeId: string | null;
}

const storageKey = (userId: string) => `speakup_seen_cases_${userId}`;

const memoryCache = new Map<string, Set<string>>();
const hydrationPromises = new Map<string, Promise<void>>();

function readLocalSeenCaseIds(userId: string): Set<string> {
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

function writeLocalSeenCaseIds(userId: string, seen: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify([...seen]));
}

function getMemorySeenCaseIds(userId: string): Set<string> {
  if (!memoryCache.has(userId)) {
    memoryCache.set(userId, readLocalSeenCaseIds(userId));
  }
  return new Set(memoryCache.get(userId));
}

function updateMemorySeenCaseIds(userId: string, seen: Set<string>): void {
  memoryCache.set(userId, new Set(seen));
  writeLocalSeenCaseIds(userId, seen);
}

export function getSeenCaseIds(userId: string): Set<string> {
  return getMemorySeenCaseIds(userId);
}

export async function hydrateSeenCases(userId: string): Promise<void> {
  if (!userId || typeof window === 'undefined') return;

  const existing = hydrationPromises.get(userId);
  if (existing) return existing;

  const hydration = (async () => {
    const localSeen = readLocalSeenCaseIds(userId);
    let remoteSeen = new Set<string>();

    try {
      remoteSeen = new Set(await fetchSeenCaseIds(userId));
    } catch (error) {
      console.warn('Could not load reviewed cases from server:', error);
      updateMemorySeenCaseIds(userId, localSeen);
      window.dispatchEvent(new CustomEvent(CASE_SEEN_HYDRATED_EVENT, { detail: { userId } }));
      return;
    }

    const merged = new Set([...localSeen, ...remoteSeen]);
    updateMemorySeenCaseIds(userId, merged);

    const unsynced = [...localSeen].filter((caseId) => !remoteSeen.has(caseId));
    if (unsynced.length > 0) {
      await Promise.allSettled(unsynced.map((caseId) => persistCaseView(userId, caseId)));
    }

    window.dispatchEvent(new CustomEvent(CASE_SEEN_HYDRATED_EVENT, { detail: { userId } }));
  })().finally(() => {
    hydrationPromises.delete(userId);
  });

  hydrationPromises.set(userId, hydration);
  return hydration;
}

export function markCaseSeen(userId: string, caseId: string): void {
  if (typeof window === 'undefined' || !userId || !caseId) return;

  const seen = getMemorySeenCaseIds(userId);
  if (seen.has(caseId)) return;

  seen.add(caseId);
  updateMemorySeenCaseIds(userId, seen);
  window.dispatchEvent(new CustomEvent(CASE_SEEN_EVENT, { detail: { userId, caseId } }));

  void persistCaseView(userId, caseId).catch((error) => {
    console.warn('Could not persist reviewed case:', error);
  });
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

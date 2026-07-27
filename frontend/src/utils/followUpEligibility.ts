import { differenceInDays } from 'date-fns';

export const FOLLOW_UP_STALE_DAYS = 3;

const CLOSED_STATUSES = new Set(['resolved', 'dismissed', 'closed']);

export interface FollowUpEligibilityInput {
  status: string;
  followUpRequested: boolean;
  lastUpdate: Date;
  now?: Date;
}

export interface FollowUpEligibilityResult {
  canRequest: boolean;
  daysSinceUpdate: number;
  daysRemaining: number;
  isClosed: boolean;
  alreadyRequested: boolean;
  reason: string;
}

export function isCaseClosed(status: string): boolean {
  return CLOSED_STATUSES.has(status);
}

export function getDaysSinceLastUpdate(lastUpdate: Date, now = new Date()): number {
  return Math.max(0, differenceInDays(now, lastUpdate));
}

export function evaluateFollowUpEligibility({
  status,
  followUpRequested,
  lastUpdate,
  now = new Date(),
}: FollowUpEligibilityInput): FollowUpEligibilityResult {
  const daysSinceUpdate = getDaysSinceLastUpdate(lastUpdate, now);
  const daysRemaining = Math.max(0, FOLLOW_UP_STALE_DAYS - daysSinceUpdate);
  const closed = isCaseClosed(status);

  if (closed) {
    return {
      canRequest: false,
      daysSinceUpdate,
      daysRemaining: 0,
      isClosed: true,
      alreadyRequested: followUpRequested,
      reason: 'This case is already closed.',
    };
  }

  if (followUpRequested) {
    return {
      canRequest: false,
      daysSinceUpdate,
      daysRemaining: 0,
      isClosed: false,
      alreadyRequested: true,
      reason: 'You have already requested a follow-up for this case.',
    };
  }

  if (daysSinceUpdate < FOLLOW_UP_STALE_DAYS) {
    const dayLabel = daysRemaining === 1 ? 'day' : 'days';
    return {
      canRequest: false,
      daysSinceUpdate,
      daysRemaining,
      isClosed: false,
      alreadyRequested: false,
      reason: `Follow-up will be available after ${daysRemaining} more ${dayLabel} without an update.`,
    };
  }

  return {
    canRequest: true,
    daysSinceUpdate,
    daysRemaining: 0,
    isClosed: false,
    alreadyRequested: false,
    reason: 'No update has been recorded for 3 or more days. You may request a follow-up.',
  };
}

/**
 * useUnreadCasesCount
 * Returns the total number of unread case updates for the current user.
 */

import { useCaseUnreadByComplaintId } from './useCaseUnreadByComplaintId';

export function useUnreadCasesCount(): number {
  const { totalUnread } = useCaseUnreadByComplaintId();
  return totalUnread;
}

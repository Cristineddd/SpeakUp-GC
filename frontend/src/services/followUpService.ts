import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationService } from './notificationService';
import { RepresentativeService } from './representativeService';
import {
  evaluateFollowUpEligibility,
  FOLLOW_UP_STALE_DAYS,
  resolveLastCaseActivityDate,
} from '../utils/followUpEligibility';

export interface RequestFollowUpInput {
  complaintId: string;
  userId: string;
  userName?: string;
}

export interface RequestFollowUpResult {
  collectionName: 'complaints' | 'reports';
  followUpRequestedAt: Date;
}

async function resolveComplaintDoc(complaintId: string) {
  const complaintsRef = doc(db, 'complaints', complaintId);
  const complaintsSnap = await getDoc(complaintsRef);

  if (complaintsSnap.exists()) {
    return {
      collectionName: 'complaints' as const,
      docRef: complaintsRef,
      data: complaintsSnap.data(),
    };
  }

  const reportsRef = doc(db, 'reports', complaintId);
  const reportsSnap = await getDoc(reportsRef);

  if (reportsSnap.exists()) {
    return {
      collectionName: 'reports' as const,
      docRef: reportsRef,
      data: reportsSnap.data(),
    };
  }

  return null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function getLastUpdateFromData(data: Record<string, unknown>): Date {
  return (
    toDate(data.lastUpdated) ||
    toDate(data.updatedAt) ||
    toDate(data.reportedAt) ||
    toDate(data.filingDate) ||
    toDate(data.createdAt) ||
    new Date()
  );
}

function getStatusHistoryDates(data: Record<string, unknown>): Date[] {
  const statusHistory = data.statusHistory;
  if (!Array.isArray(statusHistory)) {
    return [];
  }

  return statusHistory
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      return toDate((entry as { updatedAt?: unknown }).updatedAt);
    })
    .filter((date): date is Date => date instanceof Date);
}

async function getLatestVisibleActivityDate(complaintId: string): Promise<Date | null> {
  try {
    const activitiesQuery = query(
      collection(db, 'caseActivities'),
      where('complaintId', '==', complaintId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(activitiesQuery);

    for (const activityDoc of snapshot.docs) {
      const activity = activityDoc.data();
      if (activity.isInternal) {
        continue;
      }

      const createdAt = toDate(activity.createdAt);
      if (createdAt) {
        return createdAt;
      }
    }
  } catch (error) {
    console.warn('Could not load case activities for follow-up eligibility:', error);
  }

  return null;
}

async function resolveLastUpdateForComplaint(
  complaintId: string,
  data: Record<string, unknown>
): Promise<Date> {
  const latestActivityDate = await getLatestVisibleActivityDate(complaintId);

  return resolveLastCaseActivityDate(
    [getLastUpdateFromData(data), ...getStatusHistoryDates(data), latestActivityDate],
    getLastUpdateFromData(data)
  );
}

export async function requestCaseFollowUp({
  complaintId,
  userId,
  userName,
}: RequestFollowUpInput): Promise<RequestFollowUpResult> {
  const resolved = await resolveComplaintDoc(complaintId);

  if (!resolved) {
    throw new Error('Case not found.');
  }

  const { data, docRef, collectionName } = resolved;
  const ownerId = (data.userId || data.complainantId) as string | undefined;

  if (!ownerId || ownerId !== userId) {
    throw new Error('You can only request a follow-up on your own case.');
  }

  const eligibility = evaluateFollowUpEligibility({
    status: String(data.status || 'pending'),
    followUpRequested: Boolean(data.followUpRequested),
    lastUpdate: await resolveLastUpdateForComplaint(complaintId, data),
  });

  if (!eligibility.canRequest) {
    throw new Error(eligibility.reason);
  }

  const now = new Date();

  await updateDoc(docRef, {
    followUpRequested: true,
    followUpRequestedAt: serverTimestamp(),
    followUpRequestedBy: userId,
  });

  const caseTitle = String(data.title || data.description || 'Case');
  const assignedTo = data.assignedTo as string | undefined;

  if (assignedTo) {
    try {
      const representative = await RepresentativeService.getById(assignedTo);
      const handlerUserId = representative?.userId;

      if (handlerUserId) {
        await NotificationService.createNotification(
          handlerUserId,
          'action_required',
          'Follow-Up Requested',
          `${userName || 'A complainant'} requested a follow-up on "${caseTitle}" after ${FOLLOW_UP_STALE_DAYS}+ days without an update.`,
          {
            priority: 'high',
            complaintId,
            actionUrl: `/admin/reports?reportId=${complaintId}`,
            actionLabel: 'View Case',
          }
        );
      }
    } catch (error) {
      console.warn('Could not notify assigned handler about follow-up request:', error);
    }
  }

  return {
    collectionName,
    followUpRequestedAt: now,
  };
}

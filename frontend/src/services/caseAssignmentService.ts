import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CaseActivityService } from './caseActivityService';
import { RepresentativeService } from './representativeService';
import { NotificationService } from './notificationService';
import { isSensitiveCaseType, GENERIC_HANDLER_ASSIGNED_MESSAGE } from '../utils/sensitiveCaseTypes';

export interface TakeCaseParams {
  complaintId: string;
  handlerRepId: string;
  handlerName: string;
  handlerRole: string;
  handlerUserId?: string;
  assignedByUserId: string;
  assignedByName: string;
  complaintType?: string;
  complainantUserId?: string;
  complaintTitle?: string;
}

const PENDING_STATUSES = new Set(['pending', 'submitted']);

/**
 * Self-assign or admin-assign a case handler without changing status to inProgress.
 */
export async function takeCase(params: TakeCaseParams): Promise<void> {
  const now = Timestamp.now();
  const historyEntry = {
    handlerId: params.handlerRepId,
    handlerName: params.handlerName,
    handlerRole: params.handlerRole,
    assignedAt: now.toDate().toISOString(),
    assignedBy: params.assignedByUserId,
    assignedByName: params.assignedByName,
  };

  const updateData = {
    assignedTo: params.handlerRepId,
    assignedToName: params.handlerName,
    assignedToRole: params.handlerRole,
    ...(params.handlerUserId ? { assignedToUserId: params.handlerUserId } : {}),
    assignedAt: now,
    assignedBy: params.assignedByUserId,
    assignedByName: params.assignedByName,
    handlerHistory: arrayUnion(historyEntry),
    updatedAt: now,
    lastUpdated: now,
  };

  const complaintRef = doc(db, 'complaints', params.complaintId);
  await updateDoc(complaintRef, updateData);

  // Mirror to reports collection when present
  try {
    const reportRef = doc(db, 'reports', params.complaintId);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      await updateDoc(reportRef, updateData);
    }
  } catch {
    // reports mirror is best-effort
  }

  await RepresentativeService.assignCase(params.handlerRepId, params.complaintId);

  await CaseActivityService.logHandlerAssignment(
    params.complaintId,
    params.handlerName,
    params.handlerUserId,
    params.assignedByUserId,
    params.assignedByName,
    false,
    isSensitiveCaseType(params.complaintType)
  );

  if (
    params.handlerUserId &&
    params.assignedByUserId !== params.handlerUserId
  ) {
    await NotificationService.sendHandlerCaseAssignedNotification(
      params.handlerUserId,
      params.complaintId,
      params.complaintTitle || 'Formal Complaint',
      'Complainant',
      params.complaintType || 'General',
      'Medium'
    );
  }

  if (params.complainantUserId) {
    const sensitive = isSensitiveCaseType(params.complaintType);
    await NotificationService.createNotification(
      params.complainantUserId,
      'handler_assigned',
      'CODI Member Assigned',
      sensitive
        ? `${GENERIC_HANDLER_ASSIGNED_MESSAGE}. You will be contacted for updates regarding "${params.complaintTitle || 'your complaint'}".`
        : `A CODI member has been assigned to your complaint: "${params.complaintTitle || 'your complaint'}". You will be contacted for updates.`,
      {
        priority: 'high',
        actionUrl: `/case-tracking/${params.complaintId}`,
        data: { reportId: params.complaintId },
      }
    );
  }
}

/**
 * Transition pending/submitted cases to inProgress when the assigned handler
 * posts their first public update or activity.
 */
export async function maybeStartInvestigation(
  complaintId: string,
  userId: string,
  userName: string
): Promise<boolean> {
  const complaintRef = doc(db, 'complaints', complaintId);
  const snap = await getDoc(complaintRef);
  if (!snap.exists()) return false;

  const data = snap.data();
  const status = (data.status as string)?.toLowerCase();
  if (!PENDING_STATUSES.has(status)) return false;
  if (!data.assignedTo) return false;

  const now = Timestamp.now();
  await updateDoc(complaintRef, {
    status: 'inProgress',
    processingStartedAt: data.processingStartedAt || now,
    updatedAt: now,
    lastUpdated: now,
  });

  try {
    const reportRef = doc(db, 'reports', complaintId);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      await updateDoc(reportRef, {
        status: 'inProgress',
        processingStartedAt: data.processingStartedAt || now,
        updatedAt: now,
        lastUpdated: now,
      });
    }
  } catch {
    // best-effort mirror
  }

  await CaseActivityService.logStatusChange(
    complaintId,
    status,
    'inProgress',
    'Investigation started following the CODI member\'s first update.',
    userId,
    userName,
    'handler',
    false
  );

  const complainantId = data.complainantId || data.userId;
  if (complainantId) {
    await NotificationService.sendComplaintInProgressNotification(
      complainantId,
      complaintId,
      data.title || 'Your complaint',
      'Your complaint is now under investigation.'
    );
  }

  return true;
}

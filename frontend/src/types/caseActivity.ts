export enum ActivityType {
  DOCUMENT_REVIEW = 'document_review',
  EVIDENCE_COLLECTION = 'evidence_collection',
  INTERVIEW = 'interview',
  INVESTIGATION = 'investigation',
  REPORT_PREPARATION = 'report_preparation',
  DELIBERATION = 'deliberation',
  STATUS_UPDATE = 'status_update',
  ASSIGNMENT = 'assignment',
  COMMUNICATION = 'communication',
  INTERNAL_NOTE = 'internal_note',
  OTHER = 'other'
}

// System actor identifier for automated actions
export const SYSTEM_ACTOR = {
  id: 'SYSTEM',
  name: 'System',
  role: 'system' as const
};

export interface CaseActivity {
  id: string;
  complaintId: string;
  activityType: ActivityType;
  description: string;
  findings?: string;
  // Actor (who performed the action)
  performedBy: string;
  performedByName: string;
  performedByRole: 'admin' | 'handler' | 'codi' | 'system';
  // Target/assignee (who the action was performed on/for)
  targetUserId?: string;
  targetUserName?: string;
  createdAt: Date;
  attachments?: string[];
  // Visibility: internal notes vs complainant-visible updates
  isInternal?: boolean; // If true, only visible to case handlers/admin
  metadata?: {
    statusBefore?: string;
    statusAfter?: string;
    notes?: string;
    [key: string]: any;
  };
}

export interface CreateCaseActivityInput {
  complaintId: string;
  activityType: ActivityType;
  description: string;
  findings?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export type ActivityActorRole = CaseActivity['performedByRole'];

/** Map representative/staff role to stored activity actor role. */
export function toActivityActorRole(role: string | null | undefined): ActivityActorRole {
  if (role === 'admin') return 'admin';
  if (role === 'codi') return 'codi';
  return 'handler';
}

/** Human-readable label for activity actor roles in timelines. */
export function formatActivityActorRole(role?: string): string | null {
  if (!role || role === 'system') return null;
  if (role === 'admin') return 'Admin';
  return 'CODI member';
}

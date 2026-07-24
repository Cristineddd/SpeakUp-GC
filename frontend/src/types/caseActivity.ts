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
  performedByRole: 'admin' | 'handler' | 'system';
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

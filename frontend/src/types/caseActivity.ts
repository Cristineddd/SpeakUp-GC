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

export interface CaseActivity {
  id: string;
  complaintId: string;
  activityType: ActivityType;
  description: string;
  findings?: string;
  performedBy: string;
  performedByName: string;
  performedByRole: 'admin' | 'handler';
  createdAt: Date;
  attachments?: string[];
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

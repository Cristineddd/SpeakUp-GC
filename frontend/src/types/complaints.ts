import { UserRole } from './users';

// Complaint Lifecycle Stages
export enum ComplaintStage {
  PRE_FILING = 'pre_filing',
  FILING = 'filing', 
  ACTION_ON_COMPLAINT = 'action_on_complaint',
  PRELIMINARY_INVESTIGATION = 'preliminary_investigation',
  INVESTIGATION_REPORT = 'investigation_report',
  FINAL_DECISION = 'final_decision',
  CLOSED = 'closed',
  WITHDRAWN = 'withdrawn'
}

export enum ComplaintStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  REQUIREMENTS_PENDING = 'requirements_pending',
  VALIDATED = 'validated',
  INVESTIGATING = 'investigating',
  AWAITING_RESPONSE = 'awaiting_response',
  UNDER_DELIBERATION = 'under_deliberation',
  IN_MEDIATION = 'in_mediation',
  AWAITING_EVIDENCE = 'awaiting_evidence',
  ON_HOLD = 'on_hold',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  WITHDRAWN = 'withdrawn'
}

export enum ComplaintType {
  SEXUAL_HARASSMENT = 'sexual_harassment',
  DISCRIMINATION = 'discrimination', 
  BULLYING = 'bullying',
  ACADEMIC_DISHONESTY = 'academic_dishonesty',
  MISCONDUCT = 'misconduct',
  VIOLATION_OF_RULES = 'violation_of_rules',
  OTHER = 'other'
}

// Person type for complainant and respondent
export enum PersonType {
  STUDENT = 'student',
  FACULTY = 'faculty',
  STAFF = 'staff',
  OTHER = 'other'
}

// Degree of sexual harassment (RA 11313 classification)
export enum HarassmentDegree {
  LIGHT = 'light',              // Light gestures, jokes, or comments
  SEVERE = 'severe',            // Unwelcome touching, advances
  GRAVE = 'grave'               // Sexual assault, rape
}


// Core Complaint Interface
export interface Complaint {
  id: string;
  complainantId: string;
  complainantType?: PersonType;  // NEW: Type of complainant
  respondentId?: string;
  respondentName: string;
  respondentAddress: string;
  respondentType?: PersonType;   // NEW: Type of respondent
  
  // Complaint Details
  title: string;
  description: string;
  statementOfFacts: string;
  type: ComplaintType;
  harassmentDegree?: HarassmentDegree;  // NEW: Degree for sexual harassment cases
  
  // Timing and Location
  incidentDate: Date;
  incidentLocation: string;
  locationVicinity?: string; // 'inside' or 'outside'
  filingDate: Date;
  
  // Status and Stage
  stage: ComplaintStage;
  status: ComplaintStatus;
  
  // Case Assignment
  assignedCODI?: string[];
  assignedAuthority?: string;
  
  // Deadlines (calculated based on filing date)
  responseDeadline?: Date;
  investigationStartDeadline?: Date;
  investigationEndDeadline?: Date;
  reportSubmissionDeadline?: Date;
  
  // Metadata
  confidentialityLevel: 'public' | 'restricted' | 'confidential';
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string; // Handler notes when updating status
}

// Evidence and Documents
export interface Evidence {
  id: string;
  complaintId: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface Affidavit {
  id: string;
  complaintId: string;
  submittedBy: string;
  type: 'complaint' | 'counter_affidavit' | 'supplemental';
  content: string;
  fileUrl?: string;
  submittedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

// Pre-filing Stage
export interface CounselingSession {
  id: string;
  complainantId: string;
  counselorId: string;
  sessionDate: Date;
  sessionType: 'initial' | 'follow_up' | 'referral';
  notes: string;
  recommendations: string[];
  followUpRequired: boolean;
  followUpDate?: Date;
  referrals: string[];
}

// Investigation Process
export interface InvestigationActivity {
  id: string;
  complaintId: string;
  investigatorId: string;
  activityType: 'document_review' | 'interview' | 'evidence_collection' | 'site_visit' | 'deliberation';
  description: string;
  findings?: string;
  date: Date;
  attachments: string[];
}

export interface InvestigationReport {
  id: string;
  complaintId: string;
  preparedBy: string;
  reviewedBy: string[];
  
  // Report Content
  executiveSummary: string;
  factualFindings: string;
  legalAnalysis: string;
  recommendations: string;
  
  // Supporting Data
  witnessStatements: string[];
  evidenceAnalysis: string;
  proceduralCompliance: boolean;
  
  // Submission Details
  submittedAt: Date;
  submittedTo: string; // Disciplining Authority ID
  reportFileUrl?: string;
}

// Final Decision
export interface Decision {
  id: string;
  complaintId: string;
  decidedBy: string; // Disciplining Authority ID
  
  // Decision Details
  decision: 'sustained' | 'not_sustained' | 'dismissed' | 'referred';
  reasoning: string;
  sanctions?: string[];
  corrective_actions?: string[];
  
  // Appeal Information
  appealable: boolean;
  appealDeadline?: Date;
  
  // Metadata
  decidedAt: Date;
  effectiveDate: Date;
  notifiedParties: string[];
  decisionFileUrl?: string;
}

// Timeline and Deadline Management
export interface Deadline {
  id: string;
  complaintId: string;
  type: 'response' | 'validation' | 'investigation_start' | 'investigation_end' | 'report_submission' | 'decision' | 'final_decision';
  dueDate: Date;
  status: 'pending' | 'met' | 'overdue' | 'extended';
  responsibleParty: string;
  notificationsSent: Date[];
  extensionRequested?: boolean;
  extensionGranted?: boolean;
  extensionReason?: string;
  description?: string;
}

// Notifications
export interface Notification {
  id: string;
  userId: string;
  complaintId?: string;
  type: 'deadline_reminder' | 'status_update' | 'assignment' | 'decision' | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
  actionRequired?: boolean;
  actionUrl?: string;
}

// System Audit and Logs
export interface AuditLog {
  id: string;
  userId: string;
  complaintId?: string;
  action: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Form Data Types for UI
export interface ComplaintFormData {
  // Complainant Information (auto-filled from user profile)
  complainantName: string;
  complainantAddress: string;
  complainantContact: string;
  complainantType?: PersonType;  // NEW: Type of complainant
  
  // Respondent Information
  respondentName: string;
  respondentAddress: string;
  respondentPosition?: string;
  respondentDepartment?: string;
  respondentType?: PersonType;  // NEW: Type of respondent
  
  // Incident Details
  title: string;
  description: string;
  statementOfFacts: string;
  type: ComplaintType;
  harassmentDegree?: HarassmentDegree;  // NEW: Degree for sexual harassment cases
  incidentDate: string;
  incidentTime?: string;
  incidentLocation: string;
  landmark?: string;
  
  // Additional Information
  witnesses?: string;
  additionalInfo?: string;
  
  // Evidence (handled separately)
  evidence: File[];
  affidavit?: File;
}

// Dashboard Data Types
export interface ComplaintSummary {
  totalComplaints: number;
  pendingComplaints: number;
  overdueDeadlines: number;
  completedInvestigations: number;
  averageProcessingTime: number;
  
  // Breakdown by stage
  byStage: Record<ComplaintStage, number>;
  byStatus: Record<ComplaintStatus, number>;
  byType: Record<ComplaintType, number>;
  
  // Recent activity
  recentComplaints: Complaint[];
  overdueItems: Deadline[];
}

// Case tracking
export interface CaseTimelineEvent {
  id: string;
  stage: ComplaintStage;
  status: ComplaintStatus;
  description: string;
  actor: string;
  actorRole?: string;
  timestamp: Date;
  attachments?: string[];
  details?: string;
  isProjected?: boolean;
}

export interface CaseTimeline {
  complaintId: string;
  events: CaseTimelineEvent[];
  currentStage: ComplaintStage;
  nextDeadline?: Deadline;
  estimatedCompletion?: Date;
}

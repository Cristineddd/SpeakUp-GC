export interface AdminUser {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

export interface LoginAttempt {
  userId: string;
  success: boolean;
  ip: string;
  timestamp: Date;
  userAgent: string;
}

export interface RateLimitInfo {
  attempts: number;
  lastAttempt: number;
}

export interface AdminReport extends Report {
  evidenceURLs?: string[];
  evidenceCount?: number;
  evidenceFileNames?: string[];
  adminNotes?: string;
  assignedToName?: string;
  assignedToRole?: string;
  slaBreached?: boolean;
  hoursUnprocessed?: number;
  escalationLevel?: number;
  escalationHistory?: {
    level: number;
    timestamp: Date;
    reason: string;
  }[];
}

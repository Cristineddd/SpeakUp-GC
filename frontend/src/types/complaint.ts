export type ComplaintSeverity = 'low' | 'medium' | 'high';

export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface ComplaintLocation {
  building?: string;
  room?: string;
  lat?: number;
  lng?: number;
  city?: string;
}

export interface Complaint {
  id?: string;
  reporterId?: string | null;
  anonymous?: boolean;
  title: string;
  description: string;
  reportedUserId?: string | null;
  location?: ComplaintLocation;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  assignedTo?: string | null;
  attachments?: string[];
  createdAt?: any;
  updatedAt?: any;
}

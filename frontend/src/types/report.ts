export interface Report {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  title: string;
  description: string;
  location?: string;
  incidentDate: Date | string;
  reportedAt: Date | string;
  status: 'pending' | 'inProgress' | 'resolved' | 'archived';
  category: 'harassment' | 'violence' | 'threat' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence?: {
    fileUrls: string[];
    fileTypes: string[];
    evidenceURLs?: string[];  // For backward compatibility and new format
  };
  adminNotes?: string;
  assignedTo?: string;
  lastUpdated?: Date | string;
  witnesses?: string;
  additionalInfo?: string;
}

export interface ReportFormData {
  title: string;
  description: string;
  location?: string;
  incidentDate: string;
  incidentTime?: string;
  category: Report['category'];
  severity: Report['severity'];
  evidence?: File[];
  witnesses?: string;
  additionalInfo?: string;
}

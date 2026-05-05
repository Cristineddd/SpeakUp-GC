// User Role Types for Formal Complaint System
export enum UserRole {
  COMPLAINANT = 'complainant',
  RESPONDENT = 'respondent', 
  CODI = 'codi',
  DISCIPLINING_AUTHORITY = 'disciplining_authority',
  GUIDANCE_COUNSELOR = 'guidance_counselor',
  SYSTEM_ADMIN = 'system_admin'
}

export interface BaseUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplainantUser extends BaseUser {
  role: UserRole.COMPLAINANT;
  studentId?: string;
  employeeId?: string;
  department: string;
  contactNumber: string;
  address: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface RespondentUser extends BaseUser {
  role: UserRole.RESPONDENT;
  position?: string;
  department: string;
  supervisorId?: string;
}

export interface CODIUser extends BaseUser {
  role: UserRole.CODI;
  position: string;
  investigationCapacity: 'lead' | 'member';
  specializations: string[];
  currentCaseload: number;
  maxCaseload: number;
}

export interface DiscipliningAuthorityUser extends BaseUser {
  role: UserRole.DISCIPLINING_AUTHORITY;
  position: string;
  jurisdiction: string[];
  decisionLevel: 'departmental' | 'institutional' | 'system';
}

export interface GuidanceCounselorUser extends BaseUser {
  role: UserRole.GUIDANCE_COUNSELOR;
  licenseNumber?: string;
  specializations: string[];
  isAvailableForConsultation: boolean;
}

export interface SystemAdminUser extends BaseUser {
  role: UserRole.SYSTEM_ADMIN;
  permissions: string[];
  lastLogin: Date;
}

export type UserProfile = 
  | ComplainantUser 
  | RespondentUser 
  | CODIUser 
  | DiscipliningAuthorityUser 
  | GuidanceCounselorUser 
  | SystemAdminUser;

// Permission constants
export const PERMISSIONS = {
  // Complaint Management
  VIEW_ALL_COMPLAINTS: 'view_all_complaints',
  VIEW_OWN_COMPLAINTS: 'view_own_complaints',
  CREATE_COMPLAINT: 'create_complaint',
  EDIT_COMPLAINT: 'edit_complaint',
  DELETE_COMPLAINT: 'delete_complaint',
  
  // Investigation
  CONDUCT_INVESTIGATION: 'conduct_investigation',
  ASSIGN_INVESTIGATOR: 'assign_investigator',
  APPROVE_INVESTIGATION: 'approve_investigation',
  
  // Decision Making
  MAKE_DISCIPLINARY_DECISION: 'make_disciplinary_decision',
  REVIEW_DECISIONS: 'review_decisions',
  APPEAL_DECISIONS: 'appeal_decisions',
  
  // Counseling
  PROVIDE_COUNSELING: 'provide_counseling',
  VIEW_COUNSELING_RECORDS: 'view_counseling_records',
  
  // System Administration
  MANAGE_USERS: 'manage_users',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
  BACKUP_DATA: 'backup_data'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.COMPLAINANT]: [
    PERMISSIONS.VIEW_OWN_COMPLAINTS,
    PERMISSIONS.CREATE_COMPLAINT,
    PERMISSIONS.EDIT_COMPLAINT
  ],
  [UserRole.RESPONDENT]: [
    PERMISSIONS.VIEW_OWN_COMPLAINTS
  ],
  [UserRole.CODI]: [
    PERMISSIONS.VIEW_ALL_COMPLAINTS,
    PERMISSIONS.CONDUCT_INVESTIGATION,
    PERMISSIONS.APPROVE_INVESTIGATION
  ],
  [UserRole.DISCIPLINING_AUTHORITY]: [
    PERMISSIONS.VIEW_ALL_COMPLAINTS,
    PERMISSIONS.MAKE_DISCIPLINARY_DECISION,
    PERMISSIONS.REVIEW_DECISIONS
  ],
  [UserRole.GUIDANCE_COUNSELOR]: [
    PERMISSIONS.PROVIDE_COUNSELING,
    PERMISSIONS.VIEW_COUNSELING_RECORDS,
    PERMISSIONS.VIEW_OWN_COMPLAINTS
  ],
  [UserRole.SYSTEM_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
    PERMISSIONS.VIEW_SYSTEM_LOGS,
    PERMISSIONS.BACKUP_DATA,
    PERMISSIONS.VIEW_ALL_COMPLAINTS
  ]
};

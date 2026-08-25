/**
 * Representative Types
 * For Case Handlers and Administrators only
 */

import { PersonType } from './complaints';

export type RepresentativeRole = 
  | 'admin'        // Full system control
  | 'handler'      // Case handler: Can be assigned to process complaints
  | 'codi';        // CODI member: Can be assigned to process complaints

export type RepresentativeStatus = 'online' | 'offline' | 'away';

export interface Representative {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: RepresentativeRole;
  department: string;
  position: string;
  phone?: string;
  photoURL?: string;
  
  // Case tracking
  assignedCases: string[];        // Complaint IDs
  activeCases: number;
  resolvedCases: number;
  totalCasesHandled: number;
  
  // Performance metrics (in hours)
  averageResponseTime: number;
  averageResolutionTime: number;
  resolutionRate: number;          // Percentage (0-100)
  
  // Availability
  isActive: boolean;
  onlineStatus: RepresentativeStatus;
  
  // Permissions
  permissions: RepresentativePermission[];
  canAssignCases: boolean;
  canEscalateCases: boolean;
  canResolveCases: boolean;
  
  // Timestamps
  createdAt: string;               // ISO date string
  updatedAt: string;
  lastActive: string;
  lastLoginAt?: string;
  
  // Metadata
  bio?: string;
  specializations?: string[];      // e.g., ["harassment", "discrimination"]
  targetGroups?: ('student' | 'faculty' | 'staff' | 'other')[];     // NEW: Which groups they handle: student, faculty, staff
  languages?: string[];            // Languages spoken
  workingHours?: {
    start: string;                 // e.g., "09:00"
    end: string;                   // e.g., "17:00"
    timezone: string;
  };
}

export type RepresentativePermission =
  | 'view_cases'
  | 'assign_cases'
  | 'update_status'
  | 'escalate_cases'
  | 'resolve_cases'
  | 'view_evidence'
  | 'send_messages'
  | 'view_analytics'
  | 'manage_representatives';

export interface HandlerAssignment {
  complaintId: string;
  complaintTitle: string;
  handlerId: string;
  handlerName: string;
  handlerRole: RepresentativeRole;
  assignedAt: string;              // ISO date string
  assignedBy: string;              // Admin user ID
  assignedByName: string;
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string;                // ISO date string
}

export interface HandlerHistoryEntry {
  handlerId: string;
  handlerName: string;
  handlerRole: string;
  assignedAt: string;
  assignedBy: string;
  assignedByName: string;
  unassignedAt?: string;
  unassignedBy?: string;
  unassignedReason?: string;
  notes?: string;
}

export interface RepresentativeStats {
  totalRepresentatives: number;
  activeRepresentatives: number;
  totalAssignedCases: number;
  totalResolvedCases: number;
  averageResolutionTime: number;
  byRole: {
    [role: string]: {
      count: number;
      activeCases: number;
      resolvedCases: number;
    };
  };
}

export interface RepresentativeFilters {
  role?: RepresentativeRole[];
  department?: string[];
  isActive?: boolean;
  onlineStatus?: RepresentativeStatus[];
  searchQuery?: string;
}

// For creating/updating representatives
export interface CreateRepresentativeData {
  userId: string;
  email: string;
  displayName: string;
  role: RepresentativeRole;
  department: string;
  position: string;
  phone?: string;
  permissions?: RepresentativePermission[];
  specializations?: string[];
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface UpdateRepresentativeData {
  displayName?: string;
  role?: RepresentativeRole;
  department?: string;
  position?: string;
  phone?: string;
  isActive?: boolean;
  permissions?: RepresentativePermission[];
  specializations?: string[];
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export const CODI_ROLE_DESCRIPTION =
  'Committee on Decorum and Investigation (CODI)';

// Role display names
export const ROLE_LABELS: Record<RepresentativeRole, string> = {
  admin: 'Administrator',
  handler: 'CODI member',
  codi: 'CODI member'
};

// Role colors for badges
export const ROLE_COLORS: Record<RepresentativeRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  handler: 'bg-orange-100 text-orange-800',
  codi: 'bg-orange-100 text-orange-800'
};

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<RepresentativeRole, RepresentativePermission[]> = {
  admin: [
    'view_cases',
    'assign_cases',
    'update_status',
    'escalate_cases',
    'resolve_cases',
    'view_evidence',
    'send_messages',
    'view_analytics',
    'manage_representatives'
  ],
  handler: [
    'view_cases',
    'update_status',
    'view_evidence',
    'send_messages'
  ],
  codi: [
    'view_cases',
    'update_status',
    'view_evidence',
    'send_messages'
  ]
};

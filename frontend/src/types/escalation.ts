/**
 * Escalation Types & Interfaces
 * Handles auto-escalation and manual escalation for unprocessed reports
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Escalation Levels
 * 0 = Normal (no escalation)
 * 1 = Priority (>24 hours unprocessed)
 * 2 = Urgent (>48 hours unprocessed)
 * 3 = Critical (>72 hours unprocessed)
 */
export type EscalationLevel = 0 | 1 | 2 | 3;

/**
 * Escalation History Entry
 */
export interface EscalationHistoryEntry {
  level: EscalationLevel;
  previousLevel: EscalationLevel;
  escalatedAt: string | Timestamp;
  escalatedBy: string;
  escalatedByName?: string;
  reason: string;
  notes?: string;
  autoEscalated: boolean; // True if automatically escalated by system
}

/**
 * Escalation Data (stored in complaint document)
 */
export interface EscalationData {
  // Current escalation state
  escalationLevel: EscalationLevel;
  isEscalated: boolean;
  escalatedAt: string | Timestamp | null;
  escalationReason?: string;
  escalationNotes?: string;
  autoEscalated: boolean;
  
  // Escalation history
  escalationHistory: EscalationHistoryEntry[];
  
  // SLA (Service Level Agreement) tracking
  slaDeadline: string | Timestamp | null;
  slaBreached: boolean;
  slaBreachedAt: string | Timestamp | null;
  
  // Time tracking
  hoursUnprocessed: number;
  daysUnprocessed: number;
  lastEscalationCheck?: string | Timestamp;
}

/**
 * Auto-Escalation Rules (in hours)
 */
export const ESCALATION_RULES = {
  PRIORITY: 24,   // 24 hours unprocessed → Level 1 (Priority)
  URGENT: 48,     // 48 hours unprocessed → Level 2 (Urgent)
  CRITICAL: 72,   // 72 hours unprocessed → Level 3 (Critical)
} as const;

/**
 * SLA Deadlines by Category (in hours)
 */
export const SLA_DEADLINES = {
  harassment: 48,           // 48 hours for harassment cases
  discrimination: 48,       // 48 hours for discrimination cases
  'sexual-harassment': 24,  // 24 hours for sexual harassment (most urgent)
  bullying: 48,            // 48 hours for bullying
  violence: 24,            // 24 hours for violence
  threat: 24,              // 24 hours for threats
  other: 72,               // 72 hours for other cases
} as const;

/**
 * Escalation Level Labels
 */
export const ESCALATION_LABELS: Record<EscalationLevel, string> = {
  0: 'Normal',
  1: 'Priority',
  2: 'Urgent',
  3: 'Critical',
};

/**
 * Escalation Level Colors (Tailwind CSS classes)
 */
export const ESCALATION_COLORS: Record<EscalationLevel, string> = {
  0: 'bg-gray-100 text-gray-800 border-gray-200',
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-orange-100 text-orange-800 border-orange-300',
  3: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Escalation Level Icons (Lucide icon names)
 */
export const ESCALATION_ICONS: Record<EscalationLevel, string> = {
  0: 'FileText',
  1: 'Clock',
  2: 'AlertTriangle',
  3: 'AlertOctagon',
};

/**
 * Manual Escalation Reasons
 */
export const ESCALATION_REASONS = [
  'Time-sensitive case',
  'High severity incident',
  'Multiple complaints',
  'External pressure',
  'Legal requirements',
  'Student safety concern',
  'Administrative priority',
  'Other (specify in notes)',
] as const;

/**
 * Calculate hours unprocessed
 */
export function calculateHoursUnprocessed(reportedAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - reportedAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Calculate days unprocessed
 */
export function calculateDaysUnprocessed(reportedAt: Date): number {
  const hours = calculateHoursUnprocessed(reportedAt);
  return Math.floor(hours / 24);
}

/**
 * Determine escalation level based on hours unprocessed
 */
export function determineEscalationLevel(hoursUnprocessed: number): EscalationLevel {
  if (hoursUnprocessed >= ESCALATION_RULES.CRITICAL) {
    return 3; // Critical
  } else if (hoursUnprocessed >= ESCALATION_RULES.URGENT) {
    return 2; // Urgent
  } else if (hoursUnprocessed >= ESCALATION_RULES.PRIORITY) {
    return 1; // Priority
  }
  return 0; // Normal
}

/**
 * Calculate SLA deadline for a category
 */
export function calculateSLADeadline(reportedAt: Date, category: string): Date {
  const slaHours = SLA_DEADLINES[category as keyof typeof SLA_DEADLINES] || SLA_DEADLINES.other;
  const deadline = new Date(reportedAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(reportedAt: Date, category: string): boolean {
  const deadline = calculateSLADeadline(reportedAt, category);
  return new Date() > deadline;
}

/**
 * Get SLA status
 */
export function getSLAStatus(reportedAt: Date, category: string): {
  deadline: Date;
  isBreached: boolean;
  hoursRemaining: number;
  percentComplete: number;
} {
  const deadline = calculateSLADeadline(reportedAt, category);
  const isBreached = new Date() > deadline;
  
  const totalMs = deadline.getTime() - reportedAt.getTime();
  const elapsedMs = new Date().getTime() - reportedAt.getTime();
  const remainingMs = deadline.getTime() - new Date().getTime();
  
  const hoursRemaining = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
  const percentComplete = Math.min(100, Math.floor((elapsedMs / totalMs) * 100));
  
  return {
    deadline,
    isBreached,
    hoursRemaining,
    percentComplete,
  };
}

/**
 * Default escalation data for new complaints
 */
export const DEFAULT_ESCALATION_DATA: EscalationData = {
  escalationLevel: 0,
  isEscalated: false,
  escalatedAt: null,
  escalationReason: undefined,
  escalationNotes: undefined,
  autoEscalated: false,
  escalationHistory: [],
  slaDeadline: null,
  slaBreached: false,
  slaBreachedAt: null,
  hoursUnprocessed: 0,
  daysUnprocessed: 0,
};

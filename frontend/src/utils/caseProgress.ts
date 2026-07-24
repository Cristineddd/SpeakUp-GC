/**
 * Case Progress Utility
 * 
 * Shared utility function for calculating case progress percentage
 * based on status. This ensures consistent progress calculation across
 * all components (case cards, detail pages, etc.).
 * 
 * Status Flow:
 * - Pending → step 1 (33%)
 * - Investigating → step 2 (66%)
 * - Decision Already Made → step 3 (100% - terminal state)
 * - Closed → 100% (terminal state)
 */

export type CaseStatus = 
  | 'pending' 
  | 'submitted' 
  | 'inProgress' 
  | 'investigating' 
  | 'ongoing' 
  | 'resolved' 
  | 'dismissed' 
  | 'closed';

/**
 * Get progress percentage for a given case status
 * 
 * @param status - The current case status
 * @returns Progress percentage (0-100)
 */
export function getCaseProgress(status: CaseStatus): number {
  const statusLower = status?.toLowerCase() || '';
  
  // Map statuses to progress steps
  const progressMap: Record<string, number> = {
    // Step 1: Initial submission
    'pending': 33,
    'submitted': 33,
    
    // Step 2: Investigation in progress
    'inprogress': 66,
    'in_progress': 66,
    'investigating': 66,
    'ongoing': 66,
    
    // Step 3: Decision made (terminal state)
    'resolved': 100,
    'dismissed': 100,
    
    // Closed (terminal state)
    'closed': 100,
  };
  
  return progressMap[statusLower] ?? 33; // Default to 33% if unknown
}

/**
 * Get step number for a given case status
 * 
 * @param status - The current case status
 * @returns Step number (1-3)
 */
export function getCaseStep(status: CaseStatus): number {
  const progress = getCaseProgress(status);
  
  if (progress <= 33) return 1;
  if (progress <= 66) return 2;
  return 3;
}

/**
 * Get status label for display
 * 
 * @param status - The current case status
 * @returns Human-readable status label
 */
export function getStatusLabel(status: CaseStatus): string {
  const statusLower = status?.toLowerCase() || '';
  
  const labelMap: Record<string, string> = {
    'pending': 'Pending',
    'submitted': 'Pending',
    'inprogress': 'Investigating',
    'in_progress': 'Investigating',
    'investigating': 'Investigating',
    'ongoing': 'Investigating',
    'resolved': 'Decision Already Made',
    'dismissed': 'Decision Already Made',
    'closed': 'Closed',
  };
  
  return labelMap[statusLower] || status;
}

/**
 * Check if status is a terminal state (no further progress)
 * 
 * @param status - The current case status
 * @returns True if status is terminal
 */
export function isTerminalStatus(status: CaseStatus): boolean {
  const progress = getCaseProgress(status);
  return progress === 100;
}

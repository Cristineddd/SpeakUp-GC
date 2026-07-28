import { addDays } from 'date-fns';
import { CaseStatus, getCaseStep } from './caseProgress';

export interface ConfidentialityAccessInfo {
  levelLabel: string;
  accessList: { role: string; access: string }[];
  note: string;
}

export function getConfidentialityAccessInfo(
  level: 'public' | 'restricted' | 'confidential' = 'confidential'
): ConfidentialityAccessInfo {
  const levelLabel = level.replace(/\b\w/g, (c) => c.toUpperCase());

  const staffAccess =
    level === 'confidential'
      ? 'No access unless explicitly authorized'
      : level === 'restricted'
        ? 'Limited access on a need-to-know basis'
        : 'Standard administrative access';

  return {
    levelLabel,
    accessList: [
      { role: 'You (complainant)', access: 'Full access to your case details and updates' },
      { role: 'Assigned CODI handler', access: 'Full case details for investigation' },
      { role: 'DEIU office', access: 'Administrative oversight and support' },
      {
        role: 'Respondent',
        access: 'Notified per RA 11313; receives limited details until formal proceedings',
      },
      { role: 'Other school staff', access: staffAccess },
    ],
    note: 'Your identity is never shared beyond authorized investigators without your consent.',
  };
}

export interface StageEstimate {
  nextStep: string;
  description: string;
  estimatedBy: Date;
  timeframeLabel: string;
}

export function getNextStageEstimate(
  status: string,
  filingDate: Date,
  isHandlerAssigned: boolean
): StageEstimate | null {
  const step = getCaseStep(status as CaseStatus);
  const statusLower = status?.toLowerCase() || '';

  if (step >= 3 || ['resolved', 'dismissed', 'closed'].includes(statusLower)) {
    return null;
  }

  if (step === 1) {
    if (isHandlerAssigned) {
      return {
        nextStep: 'Investigating',
        description:
          'Your assigned case handler is reviewing your complaint. Investigation typically begins shortly after initial review.',
        estimatedBy: addDays(filingDate, 10),
        timeframeLabel: 'Usually within 7–10 days of filing',
      };
    }

    return {
      nextStep: 'Case handler assignment',
      description:
        'Your complaint is being validated and a CODI case handler will be assigned.',
      estimatedBy: addDays(filingDate, 3),
      timeframeLabel: 'Usually within 3 days of filing',
    };
  }

  return {
    nextStep: 'Decision',
    description:
      'Investigation is underway. The CODI will gather evidence and prepare a report for the Disciplining Authority.',
    estimatedBy: addDays(filingDate, 45),
    timeframeLabel: 'Investigation typically takes 30–45 days',
  };
}

export const SENSITIVE_HANDLER_NOTE =
  'For your protection, handler names are not shown on sensitive cases. Use Request Follow-Up or contact the DEIU office to reach your assigned handler.';

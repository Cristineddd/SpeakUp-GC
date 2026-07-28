import type { ReportStatus } from '@/hooks/useReportStatus';

export interface StatusNoteSuggestion {
  /** Short label shown in the dropdown */
  label: string;
  /** Full sentence inserted into the notes field */
  text: string;
}

const IN_PROGRESS_SUGGESTIONS: StatusNoteSuggestion[] = [
  {
    label: 'Begin preliminary review',
    text: 'I will begin the preliminary review of the submitted complaint and supporting documents.',
  },
  {
    label: 'Investigation now underway',
    text: 'This case is now under ongoing investigation. Initial document review is in progress.',
  },
  {
    label: 'Contact complainant if needed',
    text: 'Investigation has commenced. The complainant will be contacted if additional information is needed.',
  },
  {
    label: 'Initial assessment started',
    text: 'The assigned CODI member is proceeding with the initial assessment of this complaint.',
  },
];

const RESOLVED_SUGGESTIONS: StatusNoteSuggestion[] = [
  {
    label: 'Investigation completed',
    text: 'Investigation completed. Findings have been reviewed and appropriate action has been determined.',
  },
  {
    label: 'Resolved after evidence review',
    text: 'The case has been resolved after a thorough review of all submitted evidence and statements.',
  },
  {
    label: 'Resolution following deliberation',
    text: 'Resolution issued following completion of the investigation and deliberation process.',
  },
];

const DISMISSED_SUGGESTIONS: StatusNoteSuggestion[] = [
  {
    label: 'Does not meet criteria',
    text: 'After initial review, this complaint does not meet the criteria for further investigation at this time.',
  },
  {
    label: 'Insufficient evidence',
    text: 'The case has been dismissed based on insufficient evidence to proceed with a full investigation.',
  },
  {
    label: 'Reviewed per guidelines',
    text: 'Complaint reviewed and dismissed in accordance with institutional investigation guidelines.',
  },
];

const CLOSURE_DECISION_SUGGESTIONS: StatusNoteSuggestion[] = [
  {
    label: 'Findings sustained',
    text: 'After review, the complaint findings were sustained and appropriate disciplinary action was recommended.',
  },
  {
    label: 'Insufficient basis to proceed',
    text: 'The investigation found insufficient basis to sustain the complaint. The case is closed accordingly.',
  },
  {
    label: 'Resolved through mediation',
    text: 'The matter was resolved through mediation. Both parties were informed of the outcome.',
  },
];

const CLOSURE_ACTION_SUGGESTIONS: StatusNoteSuggestion[] = [
  {
    label: 'Warning issued',
    text: 'A formal warning was issued to the respondent and documented in their record.',
  },
  {
    label: 'Counseling / referral',
    text: 'The respondent was referred for counseling and follow-up monitoring was arranged.',
  },
  {
    label: 'No further action',
    text: 'No further disciplinary action is required. The case file has been archived.',
  },
];

export function getStatusNoteSuggestions(targetStatus: ReportStatus | null): StatusNoteSuggestion[] {
  switch (targetStatus) {
    case 'inProgress':
      return IN_PROGRESS_SUGGESTIONS;
    case 'resolved':
      return RESOLVED_SUGGESTIONS;
    case 'dismissed':
      return DISMISSED_SUGGESTIONS;
    default:
      return [];
  }
}

export function getClosureDecisionSuggestions(): StatusNoteSuggestion[] {
  return CLOSURE_DECISION_SUGGESTIONS;
}

export function getClosureActionSuggestions(): StatusNoteSuggestion[] {
  return CLOSURE_ACTION_SUGGESTIONS;
}

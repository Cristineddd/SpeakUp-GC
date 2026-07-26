import { cn } from '../../lib/utils';

export type CaseStatusKey =
  | 'pending'
  | 'submitted'
  | 'inProgress'
  | 'investigating'
  | 'resolved'
  | 'dismissed'
  | 'closed'
  | string;

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-qc-muted/20 text-qc-pine border-qc-muted/30',
  },
  submitted: {
    label: 'Pending',
    className: 'bg-qc-muted/20 text-qc-pine border-qc-muted/30',
  },
  inprogress: {
    label: 'Investigating',
    className: 'bg-qc-sage text-qc-cream border-qc-sage',
  },
  in_progress: {
    label: 'Investigating',
    className: 'bg-qc-sage text-qc-cream border-qc-sage',
  },
  investigating: {
    label: 'Investigating',
    className: 'bg-qc-sage text-qc-cream border-qc-sage',
  },
  resolved: {
    label: 'Decision Made',
    className: 'bg-qc-pine text-qc-cream border-qc-pine',
  },
  dismissed: {
    label: 'Dismissed',
    className: 'bg-qc-terracotta/90 text-qc-cream border-qc-terracotta',
  },
  closed: {
    label: 'Closed',
    className: 'bg-qc-pine/80 text-qc-cream border-qc-pine/80',
  },
};

function normalizeStatus(status: string) {
  return status?.toLowerCase().replace(/\s+/g, '') || 'pending';
}

interface CaseStatusBadgeProps {
  status: CaseStatusKey;
  className?: string;
}

/** Unified status pill — same look for admin, handler, and complainant views */
export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  const key = normalizeStatus(String(status));
  const config = STATUS_STYLES[key] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-qc-muted/15 text-qc-pine border-qc-muted/25',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export default CaseStatusBadge;

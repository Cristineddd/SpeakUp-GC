import { cn } from '../../lib/utils';

interface CaseIdSealProps {
  caseId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { ring: 'h-8 w-8', text: 'text-[8px]', label: 'text-[9px]' },
  md: { ring: 'h-10 w-10', text: 'text-[9px]', label: 'text-xs' },
  lg: { ring: 'h-12 w-12', text: 'text-[10px]', label: 'text-sm' },
};

/** Circular seal/stamp motif for Case IDs — unified across admin + complainant views */
export function CaseIdSeal({ caseId, size = 'md', className }: CaseIdSealProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <div
        className={cn(
          s.ring,
          'rounded-full border-2 border-qc-sage/50 flex items-center justify-center',
          'bg-gradient-to-br from-qc-cream to-qc-sage/10 shadow-inner',
          'ring-1 ring-qc-pine/5'
        )}
        aria-hidden
      >
        <span className={cn(s.text, 'font-mono font-medium text-qc-sage uppercase tracking-wider')}>
          GC
        </span>
      </div>
      <span className={cn(s.label, 'font-mono font-medium text-qc-pine tracking-wide')}>
        {caseId}
      </span>
    </div>
  );
}

export default CaseIdSeal;

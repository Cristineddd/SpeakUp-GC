export const FILING_IDENTITY_COLORS = {
  Anonymous: '#6366f1',
  Identified: '#1D9E75',
} as const;

export type FilingIdentityLabel = keyof typeof FILING_IDENTITY_COLORS;

export const FILING_IDENTITY_STYLES: Record<
  FilingIdentityLabel,
  {
    bar: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  Anonymous: {
    bar: 'bg-indigo-500',
    bg: 'bg-indigo-50/80',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    dot: 'bg-indigo-500',
  },
  Identified: {
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    dot: 'bg-emerald-500',
  },
};

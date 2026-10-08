import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CaseDetailStat({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-emerald-100 bg-[#F4FBF7] p-3 sm:p-4 dark:border-[#2f4a40] dark:bg-[#1a2e26]',
        className
      )}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70 dark:text-emerald-200/80">
        {label}
      </p>
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">{children}</div>
    </div>
  );
}

export function CaseDetailSection({
  title,
  icon: Icon,
  children,
  variant = 'default',
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: 'default' | 'muted' | 'notice' | 'respondent';
  className?: string;
}) {
  const variants = {
    default: 'border-emerald-100/80 bg-white dark:border-[#2f4a40] dark:bg-[#18241f]',
    muted: 'border-gray-100 bg-gray-50/40 dark:border-[#2f4a40] dark:bg-[#15241f]',
    notice: 'border-blue-100 bg-blue-50/40 dark:border-blue-900/50 dark:bg-[#152433]',
    respondent: 'border-amber-100 bg-amber-50/30 dark:border-amber-900/50 dark:bg-[#2a2418]',
  };

  return (
    <div className={cn('rounded-2xl border p-4 sm:p-5', variants[variant], className)}>
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-[#1D9E75]" />}
        {title}
      </h4>
      {children}
    </div>
  );
}

export function CaseDetailGrid({
  children,
  columns = 2,
  className,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CaseDetailField({
  label,
  value,
  fullWidth,
  className,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(fullWidth && 'sm:col-span-2', className)}>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-50">{value ?? '—'}</div>
    </div>
  );
}

export function CaseDetailTextBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-h-40 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/90 p-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap dark:border-[#2f4a40] dark:bg-[#15241f] dark:text-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CaseDetailNotice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs italic text-emerald-900/80 dark:border-[#2f4a40] dark:bg-[#1a2e26] dark:text-emerald-100',
        className
      )}
    >
      {children}
    </p>
  );
}

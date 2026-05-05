/**
 * PageHeader — SpeakUp GC
 *
 * Shared page header used across all authenticated pages for consistency.
 * Renders a title, optional subtitle, and optional right-side action slot.
 *
 * Usage:
 *   <PageHeader
 *     title="My Cases"
 *     subtitle="Track and manage all your filed complaints"
 *     action={<Button>+ File New</Button>}
 *   />
 */
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

/**
 * PageShell — consistent page wrapper (background, max-width, padding)
 * Wrap every authenticated page content in this.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </div>
    </div>
  );
}

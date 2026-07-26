import { cn } from './utils';

/** Shared sidebar shell — complainant + admin */
export function sidebarShell(collapsed: boolean, expandedWidth = 'w-60') {
  return cn(
    'flex flex-col border-r border-border/40 transition-all duration-300',
    'bg-qc-sidebar/95 backdrop-blur-md shadow-[inset_-1px_0_0_rgba(27,46,40,0.04)]',
    collapsed ? 'w-20' : expandedWidth
  );
}

export function sidebarBrandTitle() {
  return 'font-display text-base font-semibold text-qc-pine tracking-tight';
}

export function navLinkClass(active: boolean, collapsed: boolean) {
  return cn(
    'flex items-center gap-3 rounded-xl transition-all duration-200 relative group',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-sage/40 focus-visible:ring-offset-2 focus-visible:ring-offset-qc-cream',
    collapsed ? 'px-3 py-3 justify-center' : 'px-3.5 py-2.5',
    active
      ? 'bg-qc-sage text-qc-cream shadow-md shadow-qc-sage/25'
      : 'text-qc-pine/80 hover:bg-qc-sage/10 hover:text-qc-pine'
  );
}

export function navIconClass(active: boolean) {
  return cn(
    'h-5 w-5 flex-shrink-0 transition-colors',
    active ? 'text-qc-cream' : 'text-qc-muted group-hover:text-qc-sage'
  );
}

export function sidebarUserAvatar(initials?: string) {
  return cn(
    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
    'bg-gradient-to-br from-qc-sage to-qc-pine text-qc-cream font-semibold text-sm',
    'ring-2 ring-qc-cream/80 shadow-sm'
  );
}

export function topBarClass() {
  return 'h-16 bg-qc-cream/90 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-6 sticky top-0 z-50';
}

export function mainContentClass() {
  return 'flex-1 qc-page-bg p-6 md:p-8';
}

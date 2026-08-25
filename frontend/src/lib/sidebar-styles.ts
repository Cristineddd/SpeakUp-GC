import { cn } from './utils';

/** Shared top inset so sidebar header and main content start on the same Y axis */
export const APP_SHELL_TOP = 'pt-6';

/** Horizontal gutter between sidebar edge and page content */
export const APP_CONTENT_X = 'px-6 lg:px-8';

/** Shared sidebar shell — complainant + admin */
export function sidebarShell(collapsed: boolean, expandedWidth = 'w-60') {
  return cn(
    'flex h-screen flex-col transition-all duration-300 relative overflow-hidden',
    'bg-white dark:bg-card border-r border-gray-200 dark:border-border',
    collapsed ? 'w-20' : expandedWidth
  );
}

export function sidebarBrandTitle() {
  return 'text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight';
}

export function navLinkClass(active: boolean, collapsed: boolean) {
  return cn(
    'flex items-center gap-3 rounded-xl transition-all duration-200 relative group',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-card',
    collapsed ? 'px-3 py-3 justify-center' : 'px-3.5 py-2.5',
    active
      ? 'bg-[#1D9E75] text-white shadow-sm dark:bg-[#1D9E75]/25 dark:text-emerald-100 dark:shadow-none dark:ring-1 dark:ring-[#1D9E75]/40'
      : 'text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
  );
}

export function navIconWrapClass(active: boolean) {
  return cn(
    'flex items-center justify-center rounded-lg p-1.5 transition-colors',
    active
      ? 'bg-white/20'
      : 'bg-green-50 dark:bg-white/5 group-hover:bg-green-100 dark:group-hover:bg-white/10'
  );
}

export function navIconClass(active: boolean, accentClass?: string) {
  return cn(
    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
    active ? 'text-white' : accentClass ?? 'text-[#1D9E75] group-hover:text-[#178F65]'
  );
}

export function sidebarUserAvatar() {
  return cn(
    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
    'bg-[#1D9E75] text-white font-bold text-sm',
    'ring-2 ring-white dark:ring-card shadow-sm'
  );
}

export function topBarClass() {
  return 'h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50';
}

export function complainantTopBarClass() {
  return cn(
    'sticky top-0 z-50 flex h-14 shrink-0 items-center justify-end',
    'border-b border-gray-200 dark:border-border bg-white dark:bg-card px-4 sm:h-16 sm:px-6'
  );
}

/**
 * Fixed dock holding the floating mobile bottom nav. Transparent and
 * pointer-events-none so only the pill itself intercepts taps.
 */
export function mobileNavDockClass() {
  return cn(
    'lg:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none',
    'px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]'
  );
}

export function mainContentClass() {
  return cn(
    'flex-1 overflow-y-auto bg-white dark:bg-background',
    'pt-4 lg:pt-6',
    APP_CONTENT_X,
    // clears the floating bottom nav (≈76px) plus the iOS home indicator
    'pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8'
  );
}

/** Inner page stack spacing — use inside route views, not on the shell */
export function pageStackClass() {
  return 'w-full space-y-6';
}

/** Soft sage outline — visible on white without feeling heavy */
export const complainantCardBorder = '1px solid var(--card-outline)';
export const complainantCardDivider = '1px solid var(--card-divider)';

/** Per-route icon accent when nav item is inactive */
export const complainantNavAccents: Record<string, string> = {
  '/dashboard': 'text-[#1D9E75]',
  '/complaints/new': 'text-[#1D9E75]',
  '/complaints': 'text-[#1D9E75]',
  '/know-your-rights': 'text-[#1D9E75]',
  '/account': 'text-gray-500',
};

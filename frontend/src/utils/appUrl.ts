/** Canonical app origin for absolute links in push notifications and emails. */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://speak-up-gc-2026.vercel.app'
  );
}

export function toAbsoluteAppUrl(path: string): string {
  if (!path) return getAppBaseUrl();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = getAppBaseUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

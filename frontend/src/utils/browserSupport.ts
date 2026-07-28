/**
 * Detects browsers SpeakUp GC cannot run on (IE, ancient engines).
 * Next.js 16 + React 19 + Firebase require evergreen Chromium / Firefox / Safari / Edge.
 */
export function isUnsupportedBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  // Internet Explorer (any version) or IE mode in Edge
  if (/MSIE |Trident\//.test(ua)) return true;

  // Extremely old engines lacking APIs the app needs
  const missingApis =
    typeof window.fetch !== "function" ||
    typeof window.Promise !== "function" ||
    typeof Object.assign !== "function" ||
    typeof URLSearchParams === "undefined";

  return missingApis;
}

export function getRecommendedBrowsers(): string[] {
  return ["Google Chrome", "Microsoft Edge", "Mozilla Firefox", "Safari"];
}

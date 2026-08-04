const SIGNIN_PAGE =
  /\/(signin|sign-in|login|log-in|signup|sign-up|register|oauth|sso)(?:\/|\?|#|$)/i;
const AUTH_PAGE = /\/auth\/(signin|sign-in|login|signup|sign-up|register)(?:\/|\?|#|$)/i;

export function looksLikeSignInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    // Ignore APIs, assets, and RSC payloads — only real sign-in pages
    if (path.startsWith("/api/")) return false;
    if (path.includes("/_next/")) return false;
    if (parsed.searchParams.has("_rsc")) return false;
    return SIGNIN_PAGE.test(path) || AUTH_PAGE.test(path);
  } catch {
    return false;
  }
}

/** Best-effort: read iframe URL when same-origin; otherwise null. */
export function readIframeUrl(iframe: HTMLIFrameElement | null): string | null {
  if (!iframe) return null;
  try {
    const href = iframe.contentWindow?.location?.href;
    return href && href !== "about:blank" ? href : null;
  } catch {
    return null;
  }
}

/**
 * Map a proxied iframe location back to the real app URL
 * (`/api/embed/proxy?...&path=/login` → `https://app.example/login`).
 */
export function resolveProxiedAppUrl(
  iframeHref: string | null,
  launchUrl: string | null
): string | null {
  if (!iframeHref) return null;
  try {
    const parsed = new URL(iframeHref);
    if (parsed.pathname.includes("/api/embed/proxy")) {
      if (!launchUrl) return null;
      const path = parsed.searchParams.get("path") || "/";
      return new URL(path, launchUrl).href;
    }
    return iframeHref;
  } catch {
    return iframeHref;
  }
}

/**
 * Watch network/resource timings for navigations to sign-in URLs on the app origin.
 * Works for many cross-origin iframe navigations in Chromium.
 */
export function watchSignInNavigations(
  appOrigin: string,
  onSignIn: (url: string) => void
): () => void {
  const seen = new Set<string>();

  function consider(url: string) {
    if (!url.startsWith(appOrigin)) return;
    if (!looksLikeSignInUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    onSignIn(url);
  }

  for (const entry of performance.getEntriesByType("resource")) {
    consider(entry.name);
  }

  if (typeof PerformanceObserver === "undefined") {
    return () => undefined;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      consider(entry.name);
    }
  });

  try {
    observer.observe({ type: "resource", buffered: true });
  } catch {
    try {
      observer.observe({ entryTypes: ["resource"] });
    } catch {
      return () => undefined;
    }
  }

  return () => observer.disconnect();
}

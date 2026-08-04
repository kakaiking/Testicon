export type EmbedLaunchMode = "iframe" | "external";

export type EmbedCheckResult = {
  mode: EmbedLaunchMode;
  reason?: string;
  hostname: string;
  launchUrl: string;
};

const FRAME_TIMEOUT_MS = 6000;

function parseFrameAncestors(csp: string | null): string[] | null {
  if (!csp) return null;
  const match = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i);
  if (!match) return null;
  return match[1]
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^['"]|['"]$/g, "").toLowerCase())
    .filter(Boolean);
}

function frameAncestorsAllowHost(frameAncestors: string[], testiconOrigin: string): boolean {
  if (frameAncestors.includes("*")) return true;
  if (frameAncestors.includes("'self'") || frameAncestors.includes("self")) {
    // 'self' means the embedded site's own origin — not Testicon
    return false;
  }

  let host: URL;
  try {
    host = new URL(testiconOrigin);
  } catch {
    return false;
  }

  for (const token of frameAncestors) {
    if (token === testiconOrigin.toLowerCase()) return true;
    if (token.startsWith("https://*.") || token.startsWith("http://*.")) {
      const suffix = token.replace(/^https?:\/\/\*\./, ".");
      if (host.hostname.endsWith(suffix) || host.hostname === suffix.slice(1)) return true;
    }
    try {
      const allowed = new URL(token);
      if (allowed.origin === host.origin) return true;
    } catch {
      // ignore malformed tokens
    }
  }

  return false;
}

export async function checkEmbeddability(
  launchUrl: string,
  testiconOrigin: string
): Promise<EmbedCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(launchUrl);
  } catch {
    return {
      mode: "external",
      reason: "Invalid launch URL",
      hostname: "",
      launchUrl,
    };
  }

  const hostname = parsed.hostname;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FRAME_TIMEOUT_MS);

    const response = await fetch(launchUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*",
        "User-Agent": "TesticonEmbedCheck/1.0",
      },
    }).finally(() => clearTimeout(timer));

    const xFrameOptions = response.headers.get("x-frame-options");
    const csp =
      response.headers.get("content-security-policy") ||
      response.headers.get("content-security-policy-report-only");
    const frameAncestors = parseFrameAncestors(csp);

    if (xFrameOptions) {
      const value = xFrameOptions.trim().toUpperCase();
      if (value === "DENY" || value === "SAMEORIGIN") {
        return {
          mode: "external",
          reason: `X-Frame-Options: ${value}`,
          hostname,
          launchUrl,
        };
      }
    }

    if (frameAncestors) {
      if (frameAncestors.includes("'none'") || frameAncestors.includes("none")) {
        return {
          mode: "external",
          reason: "CSP frame-ancestors 'none'",
          hostname,
          launchUrl,
        };
      }
      if (!frameAncestorsAllowHost(frameAncestors, testiconOrigin)) {
        return {
          mode: "external",
          reason: "CSP frame-ancestors does not include Testicon",
          hostname,
          launchUrl,
        };
      }
    }

    return { mode: "iframe", hostname, launchUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preflight failed";
    // Network failures shouldn't force external forever — try iframe first.
    return {
      mode: "iframe",
      reason: `Preflight inconclusive: ${message}`,
      hostname,
      launchUrl,
    };
  }
}

export function preferredLaunchModeKey(appId: string) {
  return `testicon_launch_mode_${appId}`;
}

/** Only "external" is sticky — and only when the user or preflight forced it. */
export function readForcedExternalMode(appId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(preferredLaunchModeKey(appId)) === "external-forced";
}

export function writeForcedExternalMode(appId: string, forced: boolean) {
  if (typeof sessionStorage === "undefined") return;
  if (forced) {
    sessionStorage.setItem(preferredLaunchModeKey(appId), "external-forced");
  } else {
    sessionStorage.removeItem(preferredLaunchModeKey(appId));
  }
}

/** Clears sticky modes from earlier builds (`external` / `iframe`) that blocked the iframe. */
export function clearLegacyLaunchMode(appId: string) {
  if (typeof sessionStorage === "undefined") return;
  const key = preferredLaunchModeKey(appId);
  const value = sessionStorage.getItem(key);
  if (value === "external" || value === "iframe") {
    sessionStorage.removeItem(key);
  }
}

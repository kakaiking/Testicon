import { isPrivateNetworkUrl } from "@/lib/private-network";

/** Always store launch URLs as absolute https URLs. */

export const LAUNCH_URL_PREFIX = "https://";

export function stripLaunchUrlPrefix(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^\/+/, "");
}

/** Build a canonical https launch URL, or null if the host/path is empty/invalid. */
export function normalizeLaunchUrl(value: string): string | null {
  const hostPath = stripLaunchUrlPrefix(value);
  if (!hostPath) return null;

  try {
    const parsed = new URL(`${LAUNCH_URL_PREFIX}${hostPath}`);
    if (parsed.protocol !== "https:" || !parsed.hostname) return null;
    // Public Testicon embeds must never target private/local networks.
    if (isPrivateNetworkUrl(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

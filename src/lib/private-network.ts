/**
 * Detect URLs that target the user's local/private network.
 * Public sites must not request these — browsers show Local Network Access prompts.
 */

function parseHostname(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("about:")) {
      return null;
    }
    // Protocol-relative
    const href = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    if (!/^https?:\/\//i.test(href) && !href.includes("://")) {
      // Relative path — not a private-network hop by itself
      return null;
    }
    return new URL(href).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function ipv4ToInt(hostname: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return null;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (octets.some((n) => n > 255)) return null;
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function isPrivateIpv4(hostname: string): boolean {
  const n = ipv4ToInt(hostname);
  if (n === null) return false;
  // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16
  if ((n & 0xff000000) === 0x00000000) return true;
  if ((n & 0xff000000) === 0x0a000000) return true;
  if ((n & 0xff000000) === 0x7f000000) return true;
  if ((n & 0xffff0000) === 0xa9fe0000) return true;
  if ((n & 0xfff00000) === 0xac100000) return true;
  if ((n & 0xffff0000) === 0xc0a80000) return true;
  return false;
}

function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname === "::1" || hostname === "[::1]") return true;
  if (hostname === "0.0.0.0") return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true;
  // IPv6 unique-local / link-local (compressed forms still contain these prefixes often)
  if (hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80")) {
    if (hostname.includes(":")) return true;
  }
  return isPrivateIpv4(hostname);
}

/** True when `url` would contact a private/local network host. Relative URLs return false. */
export function isPrivateNetworkUrl(url: string): boolean {
  const hostname = parseHostname(url);
  if (!hostname) return false;
  return isPrivateHostname(hostname);
}

/**
 * Browser-side copy of the private-network check, injected into the embed bootstrap.
 * Keep in sync with isPrivateNetworkUrl above.
 */
export const PRIVATE_NETWORK_CHECK_JS = `
function isPrivateNetworkUrl(url) {
  if (!url) return false;
  var s = String(url).trim();
  if (!s || s.indexOf("data:") === 0 || s.indexOf("blob:") === 0 || s.indexOf("about:") === 0) return false;
  try {
    var href = s.indexOf("//") === 0 ? "https:" + s : s;
    if (href.indexOf("http://") !== 0 && href.indexOf("https://") !== 0) return false;
    var hostname = new URL(href).hostname.toLowerCase();
    if (!hostname) return false;
    if (hostname === "localhost" || hostname.slice(-10) === ".localhost") return true;
    if (hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0") return true;
    if (hostname.slice(-6) === ".local" || hostname.slice(-9) === ".internal") return true;
    if ((hostname.indexOf("fc") === 0 || hostname.indexOf("fd") === 0 || hostname.indexOf("fe80") === 0) && hostname.indexOf(":") !== -1) return true;
    var m = /^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/.exec(hostname);
    if (!m) return false;
    var a = +m[1], b = +m[2], c = +m[3], d = +m[4];
    if (a > 255 || b > 255 || c > 255 || d > 255) return false;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch (e) {
    return false;
  }
}
`;

export function baseHrefForLaunchUrl(launchUrl: string): string {
  const url = new URL(launchUrl);
  const dir = url.pathname.endsWith("/")
    ? url.pathname
    : url.pathname.replace(/\/[^/]*$/, "/");
  return `${url.origin}${dir}`;
}

/** Base href for the currently proxied document (submodules live in nested dirs). */
export function baseHrefForProxiedPath(launchUrl: string, path: string | null): string {
  const targetUrl = resolveProxiedTargetUrl(launchUrl, path);
  const url = new URL(targetUrl);
  const dir = url.pathname.endsWith("/")
    ? url.pathname
    : url.pathname.replace(/\/[^/]*$/, "/");
  return `${url.origin}${dir}`;
}

export function buildProxyUrl(testiconOrigin: string, testAppId: string, path?: string): string {
  const params = new URLSearchParams({ testAppId });
  if (path) params.set("path", path);
  return `${testiconOrigin}/api/embed/proxy?${params.toString()}`;
}

export function resolveProxiedTargetUrl(launchUrl: string, path: string | null): string {
  if (!path) return launchUrl;
  return new URL(path, baseHrefForLaunchUrl(launchUrl)).href;
}

function proxiedRelativePath(launchUrl: string, resolvedAbsoluteUrl: string): string | null {
  const launchOrigin = new URL(launchUrl).origin;
  if (!resolvedAbsoluteUrl.startsWith(launchOrigin)) return null;

  const base = new URL(baseHrefForLaunchUrl(launchUrl));
  const target = new URL(resolvedAbsoluteUrl);
  let rel = target.pathname;
  const prefix = base.pathname.replace(/\/$/, "");
  if (prefix && rel.startsWith(prefix)) {
    rel = rel.slice(prefix.length);
  }
  rel = rel.replace(/^\//, "");
  if (target.search) rel += target.search;
  if (target.hash) rel += target.hash;
  return rel || "index.html";
}

/** Paths on the Testicon host that must not be rewritten to the embedded app. */
const TESTICON_OWNED_PATH_PREFIXES = [
  "/api/embed/",
  "/embed-sdk.js",
  "/modern-screenshot.js",
];

export function isTesticonOwnedPath(pathname: string): boolean {
  return TESTICON_OWNED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function resolveEmbeddedAbsoluteUrl(
  launchUrl: string,
  absoluteOrRelativeUrl: string,
  documentBaseHref?: string,
  proxyOrigin?: string
): string | null {
  if (!absoluteOrRelativeUrl || absoluteOrRelativeUrl.startsWith("data:") || absoluteOrRelativeUrl.startsWith("blob:")) {
    return null;
  }

  try {
    const launchOrigin = new URL(launchUrl).origin;
    let resolved: string;

    if (absoluteOrRelativeUrl.startsWith("http://") || absoluteOrRelativeUrl.startsWith("https://")) {
      resolved = absoluteOrRelativeUrl;
    } else if (absoluteOrRelativeUrl.startsWith("/")) {
      resolved = `${launchOrigin}${absoluteOrRelativeUrl}`;
    } else {
      const resolveBase = documentBaseHref || baseHrefForLaunchUrl(launchUrl);
      resolved = new URL(absoluteOrRelativeUrl, resolveBase).href;
    }

    if (proxyOrigin && resolved.startsWith(proxyOrigin)) {
      const path = resolved.slice(proxyOrigin.length);
      if (isTesticonOwnedPath(path)) return null;
      resolved = `${launchOrigin}${path}`;
    }

    if (!resolved.startsWith(launchOrigin)) return null;
    return resolved;
  } catch {
    return null;
  }
}

export function toProxiedPath(
  launchUrl: string,
  absoluteOrRelativeUrl: string,
  documentBaseHref?: string
): string | null {
  const resolved = resolveEmbeddedAbsoluteUrl(launchUrl, absoluteOrRelativeUrl, documentBaseHref);
  if (!resolved) return null;
  return proxiedRelativePath(launchUrl, resolved);
}

function rewriteCssUrls(css: string, cssBaseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, urlPath) => {
    const trimmed = urlPath.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return match;
    try {
      const absolute = new URL(trimmed, cssBaseUrl).href;
      return `url(${quote}${absolute}${quote})`;
    } catch {
      return match;
    }
  });
}

export function rewriteIframeSrcInHtml(
  html: string,
  launchUrl: string,
  proxyBase: string,
  documentBaseHref?: string
): string {
  return html.replace(/<iframe\b([^>]*)\bsrc=["']([^"']*)["']/gi, (match, attrs, src) => {
    const path = toProxiedPath(launchUrl, src, documentBaseHref);
    if (!path) return match;
    const newSrc = `${proxyBase}&path=${encodeURIComponent(path)}`;
    return `<iframe${attrs}src="${newSrc}"`;
  });
}

function rewriteTaggedUrlsInHtml(
  html: string,
  launchUrl: string,
  proxyBase: string,
  documentBaseHref: string,
  tagPattern: RegExp
): string {
  return html.replace(tagPattern, (match, prefix, src, suffix) => {
    const path = toProxiedPath(launchUrl, src, documentBaseHref);
    if (!path) return match;
    const newSrc = `${proxyBase}&path=${encodeURIComponent(path)}`;
    return `${prefix}${newSrc}${suffix}`;
  });
}

export function rewriteResourceUrlsInHtml(
  html: string,
  launchUrl: string,
  proxyBase: string,
  documentBaseHref: string
): string {
  let processed = html;
  processed = rewriteTaggedUrlsInHtml(
    processed,
    launchUrl,
    proxyBase,
    documentBaseHref,
    /(<script\b[^>]*\bsrc=["'])([^"']*)(["'][^>]*>)/gi
  );
  processed = rewriteTaggedUrlsInHtml(
    processed,
    launchUrl,
    proxyBase,
    documentBaseHref,
    /(<link\b[^>]*\bhref=["'])([^"']*)(["'][^>]*>)/gi
  );
  processed = rewriteTaggedUrlsInHtml(
    processed,
    launchUrl,
    proxyBase,
    documentBaseHref,
    /(<img\b[^>]*\bsrc=["'])([^"']*)(["'][^>]*>)/gi
  );
  return processed;
}

export function buildEmbedBootstrapScript(launchUrl: string, proxyBase: string): string {
  const launchOrigin = JSON.stringify(new URL(launchUrl).origin);
  const launchBase = JSON.stringify(baseHrefForLaunchUrl(launchUrl));
  const proxyBaseJson = JSON.stringify(proxyBase);

  return `<script>
(function () {
  if (window.self === window.top) return;
  window.__TESTICON_EMBED__ = true;

  var LAUNCH_ORIGIN = ${launchOrigin};
  var LAUNCH_BASE = ${launchBase};
  var PROXY_BASE = ${proxyBaseJson};

  var TESTICON_OWNED = ${JSON.stringify(TESTICON_OWNED_PATH_PREFIXES)};

  function isTesticonOwnedPath(pathname) {
    for (var i = 0; i < TESTICON_OWNED.length; i++) {
      if (pathname.indexOf(TESTICON_OWNED[i]) === 0) return true;
    }
    return false;
  }

  function resolveEmbeddedAbsoluteUrl(url) {
    if (!url || url.indexOf("data:") === 0 || url.indexOf("blob:") === 0) return null;
    try {
      var resolved;
      if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        resolved = url;
      } else if (url.indexOf("/") === 0) {
        resolved = LAUNCH_ORIGIN + url;
      } else {
        resolved = new URL(url, document.baseURI || LAUNCH_BASE).href;
      }
      var proxyOrigin = window.location.origin;
      if (resolved.indexOf(proxyOrigin) === 0) {
        var path = resolved.slice(proxyOrigin.length);
        if (isTesticonOwnedPath(path)) return null;
        resolved = LAUNCH_ORIGIN + path;
      }
      if (resolved.indexOf(LAUNCH_ORIGIN) !== 0) return null;
      return resolved;
    } catch (e) {
      return null;
    }
  }

  function toProxiedPath(url) {
    var resolved = resolveEmbeddedAbsoluteUrl(url);
    if (!resolved) return null;
    try {
      var base = new URL(LAUNCH_BASE);
      var target = new URL(resolved);
      var rel = target.pathname;
      var prefix = base.pathname.replace(/\\/$/, "");
      if (prefix && rel.indexOf(prefix) === 0) rel = rel.slice(prefix.length);
      rel = rel.replace(/^\\//, "") + target.search + target.hash;
      return rel || "index.html";
    } catch (e) {
      return null;
    }
  }

  function proxyUrl(url) {
    var path = toProxiedPath(url);
    return path ? PROXY_BASE + "&path=" + encodeURIComponent(path) : url;
  }

  function applyTesticonSession(ctx) {
    var session = {
      email: ctx.tester.email,
      name: ctx.tester.name || ctx.tester.email,
      expiry: ctx.expiresAt || Date.now() + 86400000,
      source: "testicon",
    };
    window.sessionUser = session;
    try {
      sessionStorage.setItem("sessionUser", JSON.stringify(session));
    } catch (e) {}
  }

  function seedPendingSession() {
    if (window.sessionUser && window.sessionUser.source === "testicon") return;
    applyTesticonSession({
      tester: { email: "pending@testicon.local", name: "Tester" },
      expiresAt: Date.now() + 86400000,
    });
  }

  seedPendingSession();

  function patchNavigation() {
    var locProto = window.Location ? window.Location.prototype : null;
    if (!locProto) return;

    ["assign", "replace"].forEach(function (method) {
      var original = locProto[method];
      if (!original) return;
      locProto[method] = function (url) {
        return original.call(this, proxyUrl(String(url)));
      };
    });

    var hrefDesc = Object.getOwnPropertyDescriptor(locProto, "href");
    if (hrefDesc && hrefDesc.set && hrefDesc.get) {
      Object.defineProperty(locProto, "href", {
        get: hrefDesc.get,
        set: function (val) {
          hrefDesc.set.call(this, proxyUrl(String(val)));
        },
        configurable: true,
      });
    }
  }

  patchNavigation();

  function patchElementAttr(proto, attr) {
    if (!proto) return;
    var desc = Object.getOwnPropertyDescriptor(proto, attr);
    if (!desc || !desc.set) return;
    Object.defineProperty(proto, attr, {
      get: desc.get,
      set: function (val) {
        desc.set.call(this, proxyUrl(String(val)));
      },
      configurable: true,
    });
  }

  function patchNetwork() {
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        var url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input && input.url
                ? input.url
                : String(input);
        var proxied = proxyUrl(url);
        if (proxied !== url) {
          if (typeof input === "string" || input instanceof URL) return origFetch(proxied, init);
          return origFetch(new Request(proxied, input), init);
        }
        return origFetch(input, init);
      };
    }

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof url === "string") {
        var proxied = proxyUrl(url);
        if (proxied !== url) args[1] = proxied;
      }
      return origOpen.apply(this, args);
    };

    patchElementAttr(HTMLScriptElement.prototype, "src");
    patchElementAttr(HTMLLinkElement.prototype, "href");

    var origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      var attr = String(name).toLowerCase();
      if (attr === "src" || attr === "href") value = proxyUrl(String(value));
      return origSetAttribute.call(this, name, value);
    };
  }

  patchNetwork();

  function bindTesticonEmbed() {
    if (!window.TesticonEmbed) return false;
    window.TesticonEmbed.onContext(function (ctx) {
      applyTesticonSession(ctx);
    });
    return true;
  }

  if (!bindTesticonEmbed()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (bindTesticonEmbed() || attempts > 100) clearInterval(timer);
    }, 50);
  }
})();
</script>`;
}

export function buildIframeHookScript(launchUrl: string, proxyBase: string): string {
  const launchOrigin = JSON.stringify(new URL(launchUrl).origin);
  const launchBase = JSON.stringify(baseHrefForLaunchUrl(launchUrl));
  const proxyBaseJson = JSON.stringify(proxyBase);

  return `<script>
(function () {
  var LAUNCH_ORIGIN = ${launchOrigin};
  var LAUNCH_BASE = ${launchBase};
  var PROXY_BASE = ${proxyBaseJson};

  var TESTICON_OWNED = ${JSON.stringify(TESTICON_OWNED_PATH_PREFIXES)};

  function isTesticonOwnedPath(pathname) {
    for (var i = 0; i < TESTICON_OWNED.length; i++) {
      if (pathname.indexOf(TESTICON_OWNED[i]) === 0) return true;
    }
    return false;
  }

  function resolveEmbeddedAbsoluteUrl(url) {
    if (!url || url.indexOf("data:") === 0 || url.indexOf("blob:") === 0) return null;
    try {
      var resolved;
      if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        resolved = url;
      } else if (url.indexOf("/") === 0) {
        resolved = LAUNCH_ORIGIN + url;
      } else {
        resolved = new URL(url, document.baseURI || LAUNCH_BASE).href;
      }
      var proxyOrigin = window.location.origin;
      if (resolved.indexOf(proxyOrigin) === 0) {
        var path = resolved.slice(proxyOrigin.length);
        if (isTesticonOwnedPath(path)) return null;
        resolved = LAUNCH_ORIGIN + path;
      }
      if (resolved.indexOf(LAUNCH_ORIGIN) !== 0) return null;
      return resolved;
    } catch (e) {
      return null;
    }
  }

  function toProxiedPath(url) {
    var resolved = resolveEmbeddedAbsoluteUrl(url);
    if (!resolved) return null;
    try {
      var base = new URL(LAUNCH_BASE);
      var target = new URL(resolved);
      var rel = target.pathname;
      var prefix = base.pathname.replace(/\\/$/, "");
      if (prefix && rel.indexOf(prefix) === 0) rel = rel.slice(prefix.length);
      rel = rel.replace(/^\\//, "") + target.search + target.hash;
      return rel || "index.html";
    } catch (e) {
      return null;
    }
  }

  function proxyUrl(url) {
    var path = toProxiedPath(url);
    return path ? PROXY_BASE + "&path=" + encodeURIComponent(path) : url;
  }

  function hookIframe(iframe) {
    if (iframe.__testiconHooked) return;
    iframe.__testiconHooked = true;

    var desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
    if (desc && desc.set && desc.get) {
      Object.defineProperty(iframe, "src", {
        get: function () {
          return desc.get.call(this);
        },
        set: function (val) {
          desc.set.call(this, proxyUrl(val));
        },
        configurable: true,
      });
    }

    var origSetAttribute = iframe.setAttribute.bind(iframe);
    iframe.setAttribute = function (name, value) {
      if (String(name).toLowerCase() === "src") value = proxyUrl(value);
      return origSetAttribute(name, value);
    };

    var current = iframe.getAttribute("src");
    if (current) {
      var proxied = proxyUrl(current);
      if (proxied !== current) origSetAttribute("src", proxied);
    }
  }

  function hookAll() {
    document.querySelectorAll("iframe").forEach(hookIframe);
  }

  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeName === "IFRAME") hookIframe(n);
        if (n.querySelectorAll) n.querySelectorAll("iframe").forEach(hookIframe);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hookAll);
  } else {
    hookAll();
  }
})();
</script>`;
}

export function injectEmbedSupport(
  html: string,
  launchUrl: string,
  testiconOrigin: string,
  testAppId: string,
  proxiedPath: string | null = null,
  inlinedStyles = ""
): string {
  const proxyBase = buildProxyUrl(testiconOrigin, testAppId);
  const baseHref = baseHrefForProxiedPath(launchUrl, proxiedPath);
  const injection = [
    `<base href="${baseHref}">`,
    buildEmbedBootstrapScript(launchUrl, proxyBase),
    buildIframeHookScript(launchUrl, proxyBase),
    inlinedStyles,
    `<script src="${testiconOrigin}/modern-screenshot.js?v=2"></script>`,
    `<script src="${testiconOrigin}/embed-sdk.js?v=16"></script>`,
  ].join("");

  let processed = html.replace(/<base\b[^>]*>/i, "");
  processed = processed.replace(
    /<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/gi,
    ""
  );
  processed = rewriteResourceUrlsInHtml(processed, launchUrl, proxyBase, baseHref);
  processed = rewriteIframeSrcInHtml(processed, launchUrl, proxyBase, baseHref);

  if (/<head[^>]*>/i.test(processed)) {
    return processed.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }

  if (/<\/head>/i.test(processed)) {
    return processed.replace(/<\/head>/i, `${injection}</head>`);
  }

  return `<!DOCTYPE html><html><head>${injection}</head><body>${processed}</body></html>`;
}

export async function inlineLaunchStylesheets(
  html: string,
  launchUrl: string,
  proxiedPath: string | null = null
): Promise<string> {
  const baseHref = baseHrefForProxiedPath(launchUrl, proxiedPath);
  const launchOrigin = new URL(launchUrl).origin;
  const linkRegex = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let result = html;

  for (const match of html.matchAll(linkRegex)) {
    const href = match[1];
    if (href.startsWith("http") && !href.startsWith(launchOrigin)) continue;

    try {
      const cssUrl = new URL(href, baseHref).href;
      const response = await fetch(cssUrl, { headers: { Accept: "text/css,*/*" } });
      if (!response.ok) continue;
      const css = rewriteCssUrls(await response.text(), cssUrl);
      result = result.replace(match[0], `<style data-inlined-from="${href}">\n${css}\n</style>`);
    } catch {
      // keep external link if fetch fails
    }
  }

  return result;
}

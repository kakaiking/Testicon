import { domToCanvas, type Options } from "modern-screenshot";
import {
  type CapturedFrame,
  scoreCanvasContent,
  withTimeout,
} from "@/lib/capture-screen";

const CAPTURE_TIMEOUT_MS = 15000;

export function shouldIgnoreCaptureNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  if (typeof node.className === "string") {
    if (node.className.includes("glow-bg") || node.className.includes("blob")) return true;
  }
  return false;
}

export function domCaptureOptions(win: Window): Options {
  return {
    backgroundColor: "#0a0f1d",
    scale: Math.min(win.devicePixelRatio || 1, 1.5),
    quality: 0.85,
    timeout: CAPTURE_TIMEOUT_MS,
    filter: (node) => !shouldIgnoreCaptureNode(node),
  };
}

/** Capture a DOM subtree to JPEG — same-origin iframe content only. */
export async function captureDomNode(
  node: Element,
  source: string
): Promise<CapturedFrame | null> {
  const win = node.ownerDocument?.defaultView ?? window;

  try {
    const canvas = await domToCanvas(node, domCaptureOptions(win));
    const score = scoreCanvasContent(canvas);
    if (canvas.width < 2 || canvas.height < 2 || !score.readable) return null;

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      variance: score.variance,
      coverage: score.coverage,
      source,
    };
  } catch (err) {
    console.warn(`[Testicon] DOM capture failed (${source}):`, err);
    return null;
  }
}

export async function captureDomNodeWithTimeout(
  node: Element,
  source: string,
  timeoutMs = CAPTURE_TIMEOUT_MS
): Promise<CapturedFrame | null> {
  return withTimeout(captureDomNode(node, source), timeoutMs);
}

function iframeHasContent(iframe: HTMLIFrameElement): boolean {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return false;
    if (doc.body.childElementCount === 0) return false;
    const text = (doc.body.textContent || "").trim();
    if (!text && !doc.body.querySelector("img, canvas, svg, video, button, input, form, table")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isVisible(el: Element): boolean {
  const view = el.ownerDocument?.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width >= 10 && rect.height >= 10;
}

function iframeArea(el: Element): number {
  const rect = el.getBoundingClientRect();
  return rect.width * rect.height;
}

/**
 * Best capture root for a same-origin iframe document.
 * Prefer the deepest visible nested iframe (module views), else documentElement.
 */
export function findIframeCaptureRoot(doc: Document): { node: Element; source: string } {
  const visibleIframes = Array.from(doc.querySelectorAll("iframe"))
    .filter((iframe): iframe is HTMLIFrameElement => iframe instanceof HTMLIFrameElement)
    .filter((iframe) => isVisible(iframe) && iframeHasContent(iframe))
    .sort((a, b) => iframeArea(b) - iframeArea(a));

  for (const iframe of visibleIframes) {
    try {
      const innerDoc = iframe.contentDocument;
      if (innerDoc?.documentElement) {
        const nested = findIframeCaptureRoot(innerDoc);
        return nested;
      }
    } catch {
      // cross-origin — skip
    }
  }

  return { node: doc.documentElement, source: "documentElement" };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  measureDataUrlQuality,
  pickBestCaptureFrame,
  validateScreenshot,
  type CapturedFrame,
  type ScreenshotCaptureResult,
} from "@/lib/capture-screen";
import {
  captureDomNodeWithTimeout,
  findIframeCaptureRoot,
} from "@/lib/dom-capture";
import {
  EMBED_MESSAGE,
  buildContextMessage,
  embedLogoutKey,
  iframeSrcOrigin,
  type EmbedContextPayload,
  type EmbedScreenshotPayload,
} from "@/lib/embed-protocol";

type LaunchData = {
  app: { id: string; name: string; launchUrl: string };
  context: EmbedContextPayload;
};

const SDK_CAPTURE_TIMEOUT_MS = 15000;

export function useEmbedBridge(appId: string | null, iframeSrc: string | null) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contextRef = useRef<EmbedContextPayload | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [ready, setReady] = useState(false);

  const allowedOrigin = iframeSrc ? iframeSrcOrigin(iframeSrc) : null;

  const deliverContext = useCallback(() => {
    const iframe = iframeRef.current;
    const context = contextRef.current;
    if (!iframe?.contentWindow || !context || !allowedOrigin) return;
    iframe.contentWindow.postMessage(buildContextMessage(context), allowedOrigin);
  }, [allowedOrigin]);

  const markLoggedOut = useCallback(() => {
    if (!appId) return;
    sessionStorage.setItem(embedLogoutKey(appId), "1");
    setLoggedOut(true);
  }, [appId]);

  const clearLoggedOut = useCallback(() => {
    if (!appId) return;
    sessionStorage.removeItem(embedLogoutKey(appId));
    setLoggedOut(false);
    deliverContext();
  }, [appId, deliverContext]);

  useEffect(() => {
    if (!appId) return;
    setLoggedOut(sessionStorage.getItem(embedLogoutKey(appId)) === "1");
  }, [appId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!allowedOrigin || event.origin !== allowedOrigin) return;
      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (data.type === EMBED_MESSAGE.READY || data.type === EMBED_MESSAGE.REQUEST_CONTEXT) {
        if (!loggedOut) deliverContext();
      }

      if (data.type === EMBED_MESSAGE.LOGOUT) {
        markLoggedOut();
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedOrigin, deliverContext, loggedOut, markLoggedOut]);

  const bindLaunchData = useCallback((data: LaunchData) => {
    contextRef.current = data.context;
    setReady(true);
  }, []);

  const onIframeLoad = useCallback(() => {
    if (!loggedOut) deliverContext();
  }, [loggedOut, deliverContext]);

  const requestScreenshot = useCallback(async (): Promise<ScreenshotCaptureResult> => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !allowedOrigin) {
      return { dataUrl: null, error: "App frame is not ready yet. Wait for the app to load, then try again." };
    }

    const [direct, fromSdk] = await Promise.all([
      captureDirectFromIframe(iframe),
      captureViaEmbedSdk(iframe, allowedOrigin, SDK_CAPTURE_TIMEOUT_MS),
    ]);

    const best = pickBestCaptureFrame([direct, fromSdk].filter((f): f is CapturedFrame => !!f));
    if (!best) {
      console.warn("[Testicon] Screenshot capture failed — no readable frame from iframe DOM capture");
      return {
        dataUrl: null,
        error: "Could not capture the app view. Wait for the page to finish loading, then click Retry.",
      };
    }

    return validateScreenshot(best.dataUrl);
  }, [allowedOrigin]);

  return {
    iframeRef,
    ready,
    loggedOut,
    bindLaunchData,
    onIframeLoad,
    clearLoggedOut,
    requestScreenshot,
  };
}

/** Capture iframe.contentDocument via modern-screenshot (same-origin only). */
async function captureDirectFromIframe(iframe: HTMLIFrameElement): Promise<CapturedFrame | null> {
  try {
    const rootDoc = iframe.contentDocument;
    if (!rootDoc?.documentElement) return null;

    const { node, source } = findIframeCaptureRoot(rootDoc);
    return captureDomNodeWithTimeout(node, `direct:${source}`);
  } catch (err) {
    console.warn("[Testicon] Direct iframe DOM capture failed:", err);
    return null;
  }
}

/** Ask the embed SDK (running inside the iframe) to capture its own document. */
async function captureViaEmbedSdk(
  iframe: HTMLIFrameElement,
  allowedOrigin: string,
  timeoutMs: number
): Promise<CapturedFrame | null> {
  const requestId = crypto.randomUUID();
  const targets: Window[] = [];

  try {
    walkFrameWindows(iframe.contentDocument, targets);
  } catch {
    // ignore
  }

  if (targets.length === 0 && iframe.contentWindow) {
    targets.push(iframe.contentWindow);
  }

  const uniqueTargets = [...new Set(targets)];
  if (uniqueTargets.length === 0) return null;

  return new Promise<CapturedFrame | null>((resolve) => {
    let settled = false;
    let pending = uniqueTargets.length;
    let best: CapturedFrame | null = null;

    function finish(result: CapturedFrame | null) {
      if (settled) return;

      if (result) {
        if (!best || result.coverage > best.coverage || (result.coverage === best.coverage && result.variance > best.variance)) {
          best = result;
        }
        if (result.coverage >= 0.22 && result.variance >= 8) {
          settled = true;
          cleanup();
          resolve(result);
          return;
        }
      }

      pending--;
      if (pending <= 0) {
        settled = true;
        cleanup();
        resolve(best);
      }
    }

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("message", onScreenshot);
    }

    function onScreenshot(event: MessageEvent) {
      if (event.origin !== allowedOrigin) return;
      const data = event.data;
      if (!data || data.type !== EMBED_MESSAGE.SCREENSHOT || data.requestId !== requestId) return;

      const payload = data.payload as EmbedScreenshotPayload | undefined;
      if (payload?.dataUrl) {
        void measureDataUrlQuality(payload.dataUrl).then((score) => {
          finish({
            dataUrl: payload.dataUrl!,
            variance: score.variance,
            coverage: score.coverage,
            source: "embed-sdk",
          });
        });
        return;
      }

      if (payload?.error && payload.error !== "delegated") {
        console.warn("[Testicon] SDK screenshot failed:", payload.error);
      }
      finish(null);
    }

    const timer = window.setTimeout(() => {
      if (!settled) {
        console.warn("[Testicon] SDK screenshot timed out");
        settled = true;
        cleanup();
        resolve(best);
      }
    }, timeoutMs);

    window.addEventListener("message", onScreenshot);

    const message = { type: EMBED_MESSAGE.REQUEST_SCREENSHOT, version: 1, requestId };
    for (const target of uniqueTargets) {
      target.postMessage(message, allowedOrigin);
    }
  });
}

function walkFrameWindows(doc: Document | null | undefined, wins: Window[]) {
  if (!doc) return;
  if (doc.defaultView) wins.push(doc.defaultView);
  for (const iframe of doc.querySelectorAll("iframe")) {
    try {
      if (iframe.contentDocument) walkFrameWindows(iframe.contentDocument, wins);
    } catch {
      // cross-origin
    }
  }
}

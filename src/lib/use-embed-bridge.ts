"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMBED_MESSAGE,
  buildContextMessage,
  embedLogoutKey,
  iframeSrcOrigin,
  type EmbedContextPayload,
} from "@/lib/embed-protocol";

type LaunchData = {
  app: { id: string; name: string; launchUrl: string };
  context: EmbedContextPayload;
};

/**
 * Bridge to an app loaded in the portal iframe (context delivery + logout).
 */
export function useEmbedBridge(appId: string | null, iframeSrc: string | null) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contextRef = useRef<EmbedContextPayload | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [ready, setReady] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

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
        setSdkReady(true);
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

  const resetSdkReady = useCallback(() => setSdkReady(false), []);

  return {
    iframeRef,
    ready,
    sdkReady,
    loggedOut,
    bindLaunchData,
    onIframeLoad,
    clearLoggedOut,
    resetSdkReady,
  };
}

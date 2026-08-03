"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Flag, Info, LogIn } from "lucide-react";
import { useEmbedBridge } from "@/lib/use-embed-bridge";
import SeveritySelect from "@/components/SeveritySelect";
import RichTextEditor, { isEmptyHtml } from "@/components/RichTextEditor";

type LaunchData = {
  app: { id: string; name: string; launchUrl: string };
  context: {
    token: string;
    tester: { id: string; email: string; name: string | null };
    app: { id: string; name: string };
    expiresAt: number;
  };
};

export default function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const [appId, setAppId] = useState<string | null>(null);
  const [launchData, setLaunchData] = useState<LaunchData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [preparingReport, setPreparingReport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const bridge = useEmbedBridge(
    appId,
    appId ? `/api/embed/proxy?testAppId=${encodeURIComponent(appId)}` : null
  );
  const {
    bindLaunchData,
    requestScreenshot,
    iframeRef,
    loggedOut,
    onIframeLoad,
    clearLoggedOut,
  } = bridge;

  useEffect(() => {
    if (document.getElementById("testicon-ms-preload")) return;
    const script = document.createElement("script");
    script.id = "testicon-ms-preload";
    script.src = "/modern-screenshot.js?v=2";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    params.then(({ id }) => {
      setAppId(id);
      fetch(`/api/portal/launch-context?testAppId=${encodeURIComponent(id)}`)
        .then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error || "Failed to load app");
          }
          return r.json() as Promise<LaunchData>;
        })
        .then((data) => {
          setLaunchData(data);
          bindLaunchData(data);
        })
        .catch((e: Error) => setLoadError(e.message));
    });
  }, [params, bindLaunchData]);

  const applyCaptureResult = useCallback((result: { dataUrl: string | null; error: string | null }) => {
    if (result.dataUrl) {
      setScreenshot(result.dataUrl);
      setScreenshotError(null);
    } else {
      setScreenshot(null);
      setScreenshotError(result.error || "Screenshot capture failed.");
    }
    setCapturingScreenshot(false);
  }, []);

  const openReportModal = useCallback(() => {
    setScreenshot(null);
    setScreenshotError(null);
    setPreparingReport(true);
    setCapturingScreenshot(true);

    void requestScreenshot()
      .then((result) => {
        setShowReport(true);
        applyCaptureResult(result);
      })
      .catch((err: unknown) => {
        console.error("[Testicon] Screenshot capture error:", err);
        setShowReport(true);
        applyCaptureResult({
          dataUrl: null,
          error: err instanceof Error ? err.message : "Screenshot capture failed unexpectedly.",
        });
      })
      .finally(() => setPreparingReport(false));
  }, [requestScreenshot, applyCaptureResult]);

  const retryScreenshot = useCallback(() => {
    setScreenshot(null);
    setScreenshotError(null);
    setCapturingScreenshot(true);
    void requestScreenshot()
      .then(applyCaptureResult)
      .catch((err: unknown) => {
        console.error("[Testicon] Screenshot retry error:", err);
        applyCaptureResult({
          dataUrl: null,
          error: err instanceof Error ? err.message : "Screenshot capture failed unexpectedly.",
        });
      });
  }, [requestScreenshot, applyCaptureResult]);

  function closeReportModal() {
    setShowReport(false);
    setScreenshot(null);
    setScreenshotError(null);
    setCapturingScreenshot(false);
    setTitle("");
    setDescription("");
    setSeverity("");
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!launchData || !title.trim() || isEmptyHtml(description) || !severity) return;
    setSubmitting(true);
    const res = await fetch("/api/portal/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testAppId: launchData.app.id,
        title,
        description,
        severity,
        screenshot,
      }),
    });
    if (res.ok) {
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setScreenshot(null);
      setTimeout(() => {
        closeReportModal();
        setSubmitted(false);
      }, 2000);
    }
    setSubmitting(false);
  }

  if (loadError) {
    return (
      <div className="iframe-shell items-center justify-center text-[var(--text-muted)]">
        {loadError}
      </div>
    );
  }

  if (!launchData) {
    return (
      <div className="iframe-shell items-center justify-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="iframe-shell">
      <div className="iframe-toolbar">
        <Link href="/portal" className="btn-secondary inline-flex items-center gap-1 nav:gap-2 text-xs nav:text-sm py-1.5 nav:py-2 px-2 nav:px-3 shrink-0">
          <ArrowLeft size={14} className="nav:hidden" />
          <ArrowLeft size={16} className="hidden nav:block" />
          <span className="hidden nav:inline">Back</span>
        </Link>
        <span className="font-heading font-semibold text-sm nav:text-base truncate mx-2">{launchData.app.name}</span>
        <button
          onClick={openReportModal}
          disabled={preparingReport}
          className="btn-primary inline-flex items-center gap-1 nav:gap-2 text-xs nav:text-sm py-1.5 nav:py-2 px-2 nav:px-3 shrink-0"
        >
          <Flag size={14} className="nav:hidden" />
          <Flag size={16} className="hidden nav:block" />
          <span className="hidden nav:inline">{preparingReport ? "Capturing…" : "Report Issue"}</span>
          <span className="nav:hidden">{preparingReport ? "…" : "Report"}</span>
        </button>
      </div>

      {loggedOut && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-amber-200/90">
            You signed out of {launchData.app.name}. Use the app&apos;s own login, or continue with your Testicon account.
          </span>
          <button
            type="button"
            onClick={clearLoggedOut}
            className="btn-secondary inline-flex items-center gap-2 text-sm py-1.5 shrink-0"
          >
            <LogIn size={14} /> Continue with Testicon
          </button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={`/api/embed/proxy?testAppId=${encodeURIComponent(launchData.app.id)}`}
        className="iframe-content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
        title={launchData.app.name}
        onLoad={onIframeLoad}
      />

      {showReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end nav:items-center justify-center p-0 nav:p-4">
          <div className="glass-card p-4 nav:p-6 w-full nav:w-[70%] max-w-full nav:max-w-[70vw] max-h-[90vh] overflow-y-auto rounded-t-2xl nav:rounded-2xl">
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="font-heading font-semibold text-lg">Issue Reported</h3>
                <p className="text-[var(--text-muted)] text-sm mt-2">Thank you — the admin team will review it.</p>
              </div>
            ) : (
              <form onSubmit={submitReport} className="space-y-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <label className="label mb-0">Screenshot</label>
                    <span className="relative inline-flex group">
                      <button
                        type="button"
                        className="inline-flex text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Screenshot info"
                      >
                        <Info size={15} strokeWidth={2} />
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] z-10 w-56 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs leading-relaxed text-[var(--text-muted)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        Captured from the embedded app only — not the browser chrome or DevTools.
                      </span>
                    </span>
                  </div>
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 overflow-hidden">
                    {capturingScreenshot && !screenshot ? (
                      <div className="flex items-center justify-center h-40 px-4 text-center text-sm text-[var(--text-muted)]">
                        Capturing screenshot…
                      </div>
                    ) : screenshot ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshot}
                          alt="Screenshot of the app at time of report"
                          className="w-full max-h-56 object-contain object-top bg-black/20 mx-auto"
                          onError={() => {
                            setScreenshot(null);
                            setScreenshotError("Screenshot preview failed to load. Try capturing again.");
                          }}
                        />
                        {screenshotError && (
                          <p className="px-4 py-2 text-xs text-amber-300/90 border-t border-[var(--border-color)]">
                            {screenshotError}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 min-h-40 px-4 py-6 text-center text-sm">
                        <p className="text-amber-300/90 font-medium">Screenshot capture failed</p>
                        <p className="text-[var(--text-muted)] max-w-md">
                          {screenshotError ||
                            "Could not capture the app iframe. Wait for the page to finish loading, then click Retry."}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={retryScreenshot}
                            disabled={capturingScreenshot}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            {capturingScreenshot ? "Capturing…" : "Retry"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">Severity</label>
                  <SeveritySelect value={severity} onChange={setSeverity} />
                </div>
                <div>
                  <label className="label">Issue</label>
                  <div className="w-full nav:w-[70%] nav:mx-auto">
                    <input className="input-field text-center" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Brief summary" />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Steps to reproduce, expected vs actual..."
                  />
                </div>
                <div className="flex flex-col-reverse nav:flex-row gap-2 nav:gap-3">
                  <button type="button" onClick={closeReportModal} className="btn-secondary w-full nav:flex-none">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 w-full nav:w-auto" disabled={submitting || !severity}>
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

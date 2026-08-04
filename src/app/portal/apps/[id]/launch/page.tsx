"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Flag,
  Info,
  LogIn,
  Pause,
  Play,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useEmbedBridge } from "@/lib/use-embed-bridge";
import { clearLegacyLaunchMode } from "@/lib/embed-check";
import { launchUrlOrigin } from "@/lib/embed-protocol";
import {
  looksLikeSignInUrl,
  readIframeUrl,
  watchSignInNavigations,
} from "@/lib/signin-detect";
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

/** briefing = tip screen while iframe loads; browser = in-app view; report = post new-tab companion */
type Phase = "briefing" | "browser" | "report";

const BRIEFING_MS = 10000;

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const [appId, setAppId] = useState<string | null>(null);
  const [launchData, setLaunchData] = useState<LaunchData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("briefing");
  const [briefingLeftMs, setBriefingLeftMs] = useState(BRIEFING_MS);
  const [briefingPaused, setBriefingPaused] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [signInModal, setSignInModal] = useState<{ url: string } | null>(null);
  const signInPromptedRef = useRef(false);

  const [showReportForm, setShowReportForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct launchUrl only — no proxy / rewrite middleware.
  const bridge = useEmbedBridge(appId, launchData?.app.launchUrl ?? null);
  const {
    bindLaunchData,
    iframeRef,
    loggedOut,
    onIframeLoad,
    clearLoggedOut,
    resetSdkReady,
  } = bridge;

  useEffect(() => {
    params.then(async ({ id }) => {
      setAppId(id);
      clearLegacyLaunchMode(id);
      try {
        const res = await fetch(`/api/portal/launch-context?testAppId=${encodeURIComponent(id)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load app");
        }
        const data = (await res.json()) as LaunchData;
        setLaunchData(data);
        bindLaunchData(data);
        setPhase("briefing");
        setBriefingLeftMs(BRIEFING_MS);
        setBriefingPaused(false);
        setIframeLoading(true);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load app");
      }
    });
  }, [params, bindLaunchData]);

  // Briefing countdown — pausable; iframe loads underneath the whole time
  useEffect(() => {
    if (!launchData || phase !== "briefing" || briefingPaused) return;

    const tick = window.setInterval(() => {
      setBriefingLeftMs((prev) => Math.max(0, prev - 100));
    }, 100);

    return () => window.clearInterval(tick);
  }, [launchData, phase, briefingPaused]);

  useEffect(() => {
    if (phase === "briefing" && briefingLeftMs <= 0) {
      setPhase("browser");
    }
  }, [phase, briefingLeftMs]);

  const skipBriefing = useCallback(() => {
    setPhase("browser");
  }, []);

  const toggleBriefingPause = useCallback(() => {
    setBriefingPaused((p) => !p);
  }, []);

  const promptSignIn = useCallback((url: string) => {
    if (phase === "report") return;
    if (signInPromptedRef.current) return;
    signInPromptedRef.current = true;
    setSignInModal({ url });
  }, [phase]);

  useEffect(() => {
    if (!launchData || phase === "briefing" || phase === "report") return;
    const origin = launchUrlOrigin(launchData.app.launchUrl);
    if (!origin) return;
    return watchSignInNavigations(origin, promptSignIn);
  }, [launchData, phase, promptSignIn]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    onIframeLoad();

    const href = readIframeUrl(iframeRef.current);
    if (href && looksLikeSignInUrl(href)) {
      promptSignIn(href);
    }
  }, [onIframeLoad, iframeRef, promptSignIn]);

  const refreshIframe = useCallback(() => {
    resetSdkReady();
    signInPromptedRef.current = false;
    setSignInModal(null);
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  }, [resetSdkReady]);

  /** Open app in new tab, then switch this page to the report companion. */
  const openInNewTabAndReport = useCallback(
    (url?: string) => {
      if (!launchData) return;
      window.open(url || launchData.app.launchUrl, "_blank", "noopener,noreferrer");
      setSignInModal(null);
      setPhase("report");
      setShowReportForm(true);
      setScreenshot(null);
      setScreenshotError(
        "Take a screenshot in the app tab, then upload or paste it here — or submit without one."
      );
    },
    [launchData]
  );

  const openExternally = useCallback(() => {
    openInNewTabAndReport(launchData?.app.launchUrl);
  }, [launchData, openInNewTabAndReport]);

  const readFileAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
  }, []);

  const applyUploadedImage = useCallback(
    async (file: File | null | undefined) => {
      if (!file || !file.type.startsWith("image/")) {
        setScreenshotError("Please choose an image file.");
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setScreenshot(dataUrl);
        setScreenshotError(null);
      } catch {
        setScreenshotError("Could not read that image. Try another file.");
      }
    },
    [readFileAsDataUrl]
  );

  const openReportModal = useCallback(() => {
    setScreenshot(null);
    setScreenshotError(
      phase === "report"
        ? "Take a screenshot in the app tab, then upload or paste it here — or submit without one."
        : "Take a screenshot of the app, then upload it here."
    );
    setShowReportForm(true);
  }, [phase]);

  function closeReportForm() {
    setShowReportForm(false);
    setScreenshot(null);
    setScreenshotError(null);
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
        closeReportForm();
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
        Opening page…
      </div>
    );
  }

  const host = hostnameOf(launchData.app.launchUrl);
  const showBrowserChrome = phase === "browser";
  const showIframe = phase === "briefing" || phase === "browser";
  const briefingLeftSec = Math.ceil(briefingLeftMs / 1000);
  const briefingProgress = 1 - briefingLeftMs / BRIEFING_MS;

  return (
    <div className="iframe-shell">
      {/* ── Briefing: tip screen while app loads behind ── */}
      {phase === "briefing" && (
        <div className="iab-briefing">
          <div className="iab-briefing-card">
            <div className="iab-briefing-icon">
              <LogIn size={28} />
            </div>
            <h1 className="font-heading font-semibold text-2xl">Before you start</h1>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mt-3">
              This app opens inside Testicon. <strong className="text-[var(--text-main)]">Sign-in
              usually won&apos;t work here</strong> — browsers block login cookies in embedded views.
            </p>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mt-2">
              If you need to sign in, you&apos;ll get an option to open a new tab. Test there, then
              come back here to report issues.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-4 font-mono truncate">{host}</p>
            <div className="iab-briefing-meter" aria-hidden>
              <div
                className="iab-briefing-meter-bar"
                style={{ transform: `scaleX(${briefingProgress})` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              {briefingPaused
                ? "Paused"
                : iframeLoading
                  ? "Loading app in the background…"
                  : "App ready — opening shortly…"}{" "}
              ({briefingLeftSec}s)
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="btn-secondary flex-1 inline-flex items-center justify-center gap-2"
                onClick={toggleBriefingPause}
              >
                {briefingPaused ? (
                  <>
                    <Play size={14} /> Resume
                  </>
                ) : (
                  <>
                    <Pause size={14} /> Pause
                  </>
                )}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={skipBriefing}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Browser chrome ── */}
      {showBrowserChrome && (
        <>
          <div className="iab-chrome">
            <Link href="/portal" className="iab-icon-btn" aria-label="Close" title="Back to portal">
              <X size={18} />
            </Link>

            <div className="iab-url-bar" title={launchData.app.launchUrl}>
              <span className="iab-host truncate">{host}</span>
              <span className="iab-app-name truncate">{launchData.app.name}</span>
            </div>

            <button
              type="button"
              className="iab-icon-btn"
              onClick={refreshIframe}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={16} className={iframeLoading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              className="iab-icon-btn"
              onClick={openExternally}
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </button>

            <button
              type="button"
              onClick={openReportModal}
              className="btn-primary inline-flex items-center gap-1 text-xs nav:text-sm py-1.5 px-2 nav:px-3 shrink-0"
            >
              <Flag size={14} />
              <span className="hidden nav:inline">Report</span>
            </button>
          </div>

          {iframeLoading && (
            <div className="iab-progress" role="progressbar" aria-label="Loading app">
              <div className="iab-progress-bar" />
            </div>
          )}

          {loggedOut && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-amber-200/90">
                You signed out of {launchData.app.name}. Use the app&apos;s own login, or continue
                with your Testicon account.
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
        </>
      )}

      {/* ── Iframe loads during briefing + browser (hidden under briefing) ── */}
      {showIframe && (
        <div
          className="iframe-frame"
          style={phase === "briefing" ? { position: "absolute", inset: 0, opacity: 0, pointerEvents: "none", zIndex: 0 } : undefined}
          aria-hidden={phase === "briefing"}
        >
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={launchData.app.launchUrl}
            className="iframe-content"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            title={launchData.app.name}
            onLoad={handleIframeLoad}
          />
        </div>
      )}

      {/* ── Report companion after opening new tab ── */}
      {phase === "report" && (
        <div className="iab-report-shell">
          <div className="iab-chrome">
            <Link href="/portal" className="iab-icon-btn" aria-label="Back to apps" title="Back to apps">
              <ArrowLeft size={18} />
            </Link>
            <div className="iab-url-bar">
              <span className="iab-host truncate">Report issue</span>
              <span className="iab-app-name truncate">{launchData.app.name}</span>
            </div>
            <button
              type="button"
              className="iab-icon-btn"
              onClick={() => openInNewTabAndReport()}
              aria-label="Re-open app tab"
              title="Re-open app tab"
            >
              <ExternalLink size={16} />
            </button>
          </div>

          <div className="iab-report-body">
            <div className="iab-report-intro">
              <p className="text-sm text-[var(--text-muted)]">
                App is open in a new tab so you can sign in and test. Come back here to file a report.
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                <Link href="/portal" className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2">
                  <ArrowLeft size={14} /> All apps
                </Link>
                <button
                  type="button"
                  className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
                  onClick={() => openInNewTabAndReport()}
                >
                  <ExternalLink size={14} /> Re-open app
                </button>
                {!showReportForm && (
                  <button
                    type="button"
                    className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                    onClick={openReportModal}
                  >
                    <Flag size={14} /> Report issue
                  </button>
                )}
              </div>
            </div>

            {showReportForm && (
              <div className="iab-report-form glass-card p-4 nav:p-6 w-full max-w-2xl relative">
                <button
                  type="button"
                  onClick={closeReportForm}
                  disabled={submitting}
                  aria-label="Close"
                  className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  <X size={16} strokeWidth={2.25} />
                </button>
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✓</div>
                    <h3 className="font-heading font-semibold text-lg">Issue Reported</h3>
                    <p className="text-[var(--text-muted)] text-sm mt-2">
                      Thank you — the admin team will review it.
                    </p>
                  </div>
                ) : (
                  <ReportForm
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    severity={severity}
                    setSeverity={setSeverity}
                    screenshot={screenshot}
                    screenshotError={screenshotError}
                    fileInputRef={fileInputRef}
                    onUpload={applyUploadedImage}
                    onRemoveScreenshot={() => {
                      setScreenshot(null);
                      setScreenshotError(null);
                    }}
                    onSubmit={submitReport}
                    submitting={submitting}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sign-in → new tab modal ── */}
      {signInModal && phase === "browser" && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <LogIn size={22} className="text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-xl">Sign in needs a new tab</h2>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Browsers block login cookies inside embedded apps. Open a new tab to sign in and
                test — this screen will switch to the report form so you can come back and file
                issues.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => openInNewTabAndReport(signInModal.url)}
            >
              Open in new tab
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setSignInModal(null)}
            >
              Stay here
            </button>
          </div>
        </div>
      )}

      {/* ── Report modal while still in browser phase ── */}
      {showReportForm && phase === "browser" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end nav:items-center justify-center p-0 nav:p-4">
          <div className="glass-card p-4 nav:p-6 w-full nav:w-[70%] max-w-full nav:max-w-[70vw] max-h-[90vh] overflow-y-auto rounded-t-2xl nav:rounded-2xl relative">
            <button
              type="button"
              onClick={closeReportForm}
              disabled={submitting}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="font-heading font-semibold text-lg">Issue Reported</h3>
                <p className="text-[var(--text-muted)] text-sm mt-2">
                  Thank you — the admin team will review it.
                </p>
              </div>
            ) : (
              <ReportForm
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                severity={severity}
                setSeverity={setSeverity}
                screenshot={screenshot}
                screenshotError={screenshotError}
                fileInputRef={fileInputRef}
                onUpload={applyUploadedImage}
                onRemoveScreenshot={() => {
                  setScreenshot(null);
                  setScreenshotError(null);
                }}
                onSubmit={submitReport}
                submitting={submitting}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportForm({
  title,
  setTitle,
  description,
  setDescription,
  severity,
  setSeverity,
  screenshot,
  screenshotError,
  fileInputRef,
  onUpload,
  onRemoveScreenshot,
  onSubmit,
  submitting,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  severity: string;
  setSeverity: (v: string) => void;
  screenshot: string | null;
  screenshotError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File | null | undefined) => void;
  onRemoveScreenshot: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 text-center"
      onPaste={(e) => {
        const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
        if (!item) return;
        e.preventDefault();
        void onUpload(item.getAsFile());
      }}
    >
      <div>
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <label className="label mb-0">Screenshot (optional)</label>
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
              Capture the app yourself, then upload or paste the image here. You can also submit
              without a screenshot.
            </span>
          </span>
        </div>
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 overflow-hidden">
          {screenshot ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshot}
                alt="Screenshot attached to this report"
                className="w-full max-h-56 object-contain object-top bg-black/20 mx-auto"
              />
              {screenshotError && (
                <p className="px-4 py-2 text-xs text-amber-300/90 border-t border-[var(--border-color)]">
                  {screenshotError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 min-h-40 px-4 py-6 text-center text-sm">
              <p className="text-[var(--text-muted)] max-w-md">
                {screenshotError ||
                  "Upload or paste a screenshot of the issue, or continue without one."}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
              >
                <Upload size={14} /> Upload
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {screenshot && (
          <div className="flex justify-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Replace
            </button>
            <button type="button" onClick={onRemoveScreenshot} className="btn-secondary text-xs py-1.5 px-3">
              Remove
            </button>
          </div>
        )}
      </div>
      <div>
        <label className="label">Severity</label>
        <SeveritySelect value={severity} onChange={setSeverity} />
      </div>
      <div>
        <label className="label">Issue</label>
        <div className="w-full nav:w-[70%] nav:mx-auto">
          <input
            className="input-field text-center"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Brief summary"
          />
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
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={submitting || !severity}
      >
        {submitting ? "Submitting..." : "Submit Report"}
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSnackbar } from "@/components/Snackbar";

type AppData = {
  id: string;
  name: string;
  ndaText: string;
  termsText: string;
  description: string | null;
  enrollment: {
    status: string;
    ndaAcceptedAt: string | null;
    termsAcceptedAt: string | null;
    understandingText: string | null;
  };
};

const STEP_META = [
  { key: 1, label: "NDA", title: "Before you go in", cta: "Agree" },
  { key: 2, label: "Terms", title: "House rules", cta: "Agree" },
  { key: 3, label: "Brief", title: "Your understanding", cta: "Enter apps" },
] as const;

export default function OnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const snackbar = useSnackbar();
  const [appId, setAppId] = useState("");
  const [app, setApp] = useState<AppData | null>(null);
  const [step, setStep] = useState(1);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [understanding, setUnderstanding] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setAppId(id);
      fetch("/api/portal/apps")
        .then((r) => r.json())
        .then((apps: AppData[]) => {
          const found = apps.find((a) => a.id === id);
          if (found) {
            setApp(found);
            if (found.enrollment.status === "ACTIVE") router.push("/portal");
          }
        });
    });
  }, [params, router]);

  async function complete() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testAppId: appId,
          ndaAccepted: step >= 1 && ndaAccepted,
          termsAccepted: step >= 2 && termsAccepted,
          understandingText: step >= 3 ? understanding : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        snackbar.error(data?.error || "Couldn’t save this step");
        setLoading(false);
        return;
      }

      if (step < 3) {
        setStep(step + 1);
        snackbar.success(step === 1 ? "NDA accepted" : "Terms accepted");
        setLoading(false);
      } else {
        await fetch("/api/portal/enrollment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testAppId: appId,
            ndaAccepted: true,
            termsAccepted: true,
            understandingText: understanding,
          }),
        });
        snackbar.success("Setup complete");
        router.push("/portal");
      }
    } catch {
      snackbar.error("Couldn’t save this step");
      setLoading(false);
    }
  }

  if (!app) {
    return (
      <div className="onboard-shell items-center justify-center text-[var(--text-muted)] font-mono text-sm">
        Loading…
      </div>
    );
  }

  const meta = STEP_META[step - 1];
  const canContinue =
    (step === 1 && ndaAccepted) ||
    (step === 2 && termsAccepted) ||
    (step === 3 && understanding.trim().length > 0);

  return (
    <div className="onboard-shell">
      <div className="onboard-progress" aria-hidden>
        {STEP_META.map((s) => (
          <div
            key={s.key}
            className={`onboard-progress-seg ${s.key <= step ? "onboard-progress-seg-on" : ""}`}
          />
        ))}
      </div>

      <header className="onboard-header">
        <Link href="/portal" className="iab-icon-btn" aria-label="Back to apps">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 text-center flex-1">
          <p className="font-mono text-[0.65rem] tracking-[0.14em] text-[var(--accent)]">
            {meta.label} · {app.name}
          </p>
          <h1 className="font-heading font-bold text-lg truncate">{meta.title}</h1>
        </div>
        <span className="w-9" aria-hidden />
      </header>

      <div className="onboard-body">
        {step === 1 && (
          <>
            <div
              className="onboard-scroll rich-text-display"
              dangerouslySetInnerHTML={{ __html: app.ndaText }}
            />
            <label className="onboard-check">
              <input
                type="checkbox"
                checked={ndaAccepted}
                onChange={(e) => setNdaAccepted(e.target.checked)}
              />
              <span>I agree to the NDA</span>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div
              className="onboard-scroll rich-text-display"
              dangerouslySetInnerHTML={{ __html: app.termsText }}
            />
            <label className="onboard-check">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>I accept the terms</span>
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              In your words — what does this app do, and what will you test?
            </p>
            {app.description && (
              <div
                className="onboard-scroll rich-text-display mb-3"
                style={{ maxHeight: "8rem" }}
                dangerouslySetInnerHTML={{ __html: app.description }}
              />
            )}
            <textarea
              className="input-field onboard-textarea"
              value={understanding}
              onChange={(e) => setUnderstanding(e.target.value)}
              placeholder="I understand that this app is…"
              required
            />
          </>
        )}
      </div>

      <div className="onboard-footer">
        <button
          type="button"
          onClick={complete}
          disabled={loading || !canContinue}
          className="btn-primary w-full"
        >
          {loading ? "Saving…" : meta.cta}
        </button>
      </div>
    </div>
  );
}

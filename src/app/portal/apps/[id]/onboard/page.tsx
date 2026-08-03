"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AppData = {
  id: string;
  name: string;
  ndaText: string;
  termsText: string;
  description: string | null;
  enrollment: { status: string; ndaAcceptedAt: string | null; termsAcceptedAt: string | null; understandingText: string | null };
};

export default function OnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
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
    await fetch("/api/portal/enrollment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testAppId: appId,
        ndaAccepted: step >= 1 && ndaAccepted,
        termsAccepted: step >= 2 && termsAccepted,
        understandingText: step >= 3 ? understanding : undefined,
      }),
    });

    if (step < 3) {
      setStep(step + 1);
      setLoading(false);
    } else {
      await fetch("/api/portal/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testAppId: appId, ndaAccepted: true, termsAccepted: true, understandingText: understanding }),
      });
      router.push("/portal");
    }
  }

  if (!app) return <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 nav:px-6 py-4 nav:py-0">
      <div className="glass-card p-4 nav:p-8 w-full nav:w-[70%] max-w-3xl nav:h-[80%] min-h-[70vh] nav:min-h-0 flex flex-col">
        <Link href="/portal" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">← Back to apps</Link>
        <div className="flex gap-2 mt-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-heading font-semibold text-center">Non-Disclosure Agreement</h2>
            <div
              className="bg-white/5 rounded-lg p-4 text-sm flex-1 min-h-0 overflow-y-auto rich-text-display"
              dangerouslySetInnerHTML={{ __html: app.ndaText }}
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={ndaAccepted} onChange={(e) => setNdaAccepted(e.target.checked)} className="w-4 h-4" />
              <span>I agree to the NDA</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-heading font-semibold text-center">Terms of Agreement</h2>
            <div
              className="bg-white/5 rounded-lg p-4 text-sm flex-1 min-h-0 overflow-y-auto rich-text-display"
              dangerouslySetInnerHTML={{ __html: app.termsText }}
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="w-4 h-4" />
              <span>I accept the terms</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-heading font-semibold text-center">Your Understanding</h2>
            <p className="text-sm text-[var(--text-muted)]">Describe what you understand this app does and what you&apos;ll be testing.</p>
            {app.description && (
              <div
                className="bg-white/5 rounded-lg p-4 text-sm rich-text-display"
                dangerouslySetInnerHTML={{ __html: app.description }}
              />
            )}
            <textarea
              className="input-field flex-1 min-h-0"
              rows={5}
              value={understanding}
              onChange={(e) => setUnderstanding(e.target.value)}
              placeholder="I understand that this app is..."
              required
            />
          </div>
        )}

        <button
          onClick={complete}
          disabled={loading || (step === 1 && !ndaAccepted) || (step === 2 && !termsAccepted) || (step === 3 && !understanding.trim())}
          className="btn-primary w-full mt-6 shrink-0"
        >
          {loading ? "Saving..." : step === 3 ? "Complete Setup" : "Continue"}
        </button>
      </div>
    </div>
  );
}

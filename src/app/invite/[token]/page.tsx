"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useSnackbar } from "@/components/Snackbar";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const snackbar = useSnackbar();
  const [info, setInfo] = useState<{ email: string; appName: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then(({ token }) => {
      fetch(`/api/invite/${token}`).then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Invalid invitation");
          return;
        }
        setInfo(data);
      });
    });
  }, [params]);

  async function accept() {
    setLoading(true);
    const { token } = await params;
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        snackbar.success("Invite accepted");
        router.push(data.redirect);
      } else {
        snackbar.error(data.error || "Couldn’t accept invite");
        setError(data.error);
        setLoading(false);
      }
    } catch {
      snackbar.error("Couldn’t accept invite");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 nav:px-6 py-10">
      <Link href="/" className="mb-8 inline-flex opacity-90 hover:opacity-100">
        <BrandMark size={32} className="text-[var(--text-main)]" />
      </Link>

      {error ? (
        <div className="access-pass">
          <div className="access-pass-header">
            <span className="access-pass-label">Access denied</span>
          </div>
          <div className="access-pass-body">
            <h1 className="font-heading text-2xl font-bold">Invite won&apos;t open</h1>
            <p className="text-[var(--accent-danger)] mt-3 text-sm">{error}</p>
          </div>
          <div className="access-pass-footer">
            <Link href="/login" className="btn-secondary w-full text-center block">
              Sign in
            </Link>
          </div>
        </div>
      ) : info ? (
        <div className="access-pass">
          <div className="access-pass-header">
            <span className="access-pass-label">You&apos;re on the list</span>
            <BrandMark size={22} className="text-[var(--text-main)]" />
          </div>
          <div className="access-pass-body">
            <p className="access-pass-key mb-2">Mission</p>
            <h1 className="access-pass-app">{info.appName}</h1>
            <div className="access-pass-meta">
              <div className="access-pass-row">
                <span className="access-pass-key">Pass holder</span>
                <span className="access-pass-val font-mono text-sm">{info.email}</span>
              </div>
              <div className="access-pass-row">
                <span className="access-pass-key">Access</span>
                <span className="access-pass-val">Invite-only · Accept to enter</span>
              </div>
            </div>
          </div>
          <div className="access-pass-footer">
            <button onClick={accept} disabled={loading} className="btn-primary w-full">
              {loading ? "Opening…" : "Accept"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[var(--text-muted)] font-mono text-sm tracking-wide">Loading pass…</p>
      )}
    </div>
  );
}

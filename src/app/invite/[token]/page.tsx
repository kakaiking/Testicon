"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [info, setInfo] = useState<{ email: string; appName: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then(({ token }) => {
      fetch(`/api/invite/${token}`)
        .then(async (r) => {
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
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      router.push(data.redirect);
    } else {
      setError(data.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 nav:px-6 py-6">
      <div className="glass-card p-6 nav:p-8 w-full max-w-md text-center">
        <span className="text-5xl">🧪</span>
        {error ? (
          <>
            <h1 className="font-heading text-2xl font-bold mt-4">Invitation Error</h1>
            <p className="text-[var(--accent-danger)] mt-3">{error}</p>
            <Link href="/login" className="btn-secondary mt-6 inline-block">Sign In</Link>
          </>
        ) : info ? (
          <>
            <h1 className="font-heading text-2xl font-bold mt-4">You&apos;re Invited!</h1>
            <p className="text-[var(--text-muted)] mt-3">
              You&apos;ve been shortlisted to test <strong className="text-[var(--text-main)]">{info.appName}</strong>
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">{info.email}</p>
            <button onClick={accept} disabled={loading} className="btn-primary w-full mt-8">
              {loading ? "Accepting..." : "Accept & Continue"}
            </button>
          </>
        ) : (
          <p className="text-[var(--text-muted)] mt-4">Loading invitation...</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useSnackbar } from "@/components/Snackbar";

export default function LoginPage({ admin = false }: { admin?: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const snackbar = useSnackbar();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, portal: admin ? "admin" : "tester" }),
      });

      const data = await res.json();
      if (!res.ok) {
        snackbar.error(data.error || "Sign in failed");
        setLoading(false);
        return;
      }

      snackbar.success("Signed in");
      // Full navigation so the shared layout re-reads the new session cookie.
      // Soft push alone leaves AdminLayoutClient with stale session=null and bounces back.
      window.location.assign(data.redirect);
    } catch {
      snackbar.error("Sign in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 nav:px-6 py-10">
      <Link href="/" className="mb-8 inline-flex">
        <BrandMark size={36} className="text-[var(--text-main)]" />
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-[0.65rem] tracking-[0.16em] text-[var(--accent)] mb-3">
            {admin ? "ADMIN" : "TESTER"}
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {admin ? "Admin sign in" : "Tester sign in"}
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {admin
              ? "Use your admin email to continue"
              : "Use the email you were invited with"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-8">
          {admin ? (
            <Link
              href="/login"
              className="text-[var(--text-main)] underline underline-offset-4 hover:text-[var(--accent)]"
            >
              Tester portal
            </Link>
          ) : (
            <>
              Have an invite link?{" "}
              <Link
                href="/invite"
                className="text-[var(--text-main)] underline underline-offset-4 hover:text-[var(--accent)]"
              >
                Open it
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

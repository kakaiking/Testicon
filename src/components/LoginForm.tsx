"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage({ admin = false }: { admin?: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, portal: admin ? "admin" : "tester" }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Sign in failed");
      setLoading(false);
      return;
    }

    router.push(data.redirect);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 nav:px-6 py-6">
      <div className="glass-card p-6 nav:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🧪</span>
          <h1 className="font-heading text-2xl font-bold mt-3">
            {admin ? "Admin Sign In" : "Tester Sign In"}
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {admin
              ? "Sign in with your admin email"
              : "Enter the email you were invited with"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-[var(--accent-danger)] text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          {admin ? (
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Tester portal
            </Link>
          ) : (
            <>
              Have an invite link?{" "}
              <Link href="/invite" className="text-[var(--accent)] hover:underline">
                Accept invitation
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

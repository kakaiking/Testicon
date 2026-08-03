"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Issue = {
  id: string;
  title: string;
  severity: string;
  status: string;
  rewardAmount: number | null;
  createdAt: string;
  testApp: { name: string };
};

export default function PortalIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    fetch("/api/portal/issues").then((r) => r.json()).then(setIssues);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-4 nav:px-6 py-3 nav:py-4 flex items-center justify-between gap-3">
        <Link href="/portal" className="flex items-center gap-2 min-w-0">
          <span className="text-xl nav:text-2xl shrink-0">🧪</span>
          <span className="font-heading font-bold text-base nav:text-lg truncate">My Issues</span>
        </Link>
        <Link href="/portal" className="btn-secondary text-sm shrink-0">← Apps</Link>
      </header>
      <div className="p-4 nav:p-6 max-w-3xl mx-auto space-y-3 nav:space-y-4">
        {issues.map((t) => (
          <div key={t.id} className="glass-card p-4 nav:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className={`severity-${t.severity.toLowerCase()} text-xs font-bold uppercase`}>{t.severity}</span>
              <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
            </div>
            <h3 className="font-heading font-semibold">{t.title}</h3>
            <p className="text-sm text-[var(--text-muted)]">{t.testApp.name}</p>
            {t.rewardAmount && (
              <p className="text-[var(--accent-success)] text-sm font-semibold mt-2">Reward: {formatCurrency(t.rewardAmount)}</p>
            )}
          </div>
        ))}
        {issues.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            No issues yet. Launch an app and use Report Issue to submit bugs.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

type Issue = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  screenshotUrl: string | null;
  rewardAmount: number | null;
  createdAt: string;
  user: { email: string };
  testApp: { name: string };
};

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    fetch("/api/admin/issues").then((r) => r.json()).then(setIssues);
  }, []);

  async function updateStatus(issueId: string, status: string) {
    await fetch("/api/admin/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, status }),
    });
    const updated = await fetch("/api/admin/issues").then((r) => r.json());
    setIssues(updated);
  }

  return (
    <div className="space-y-4">
        {issues.map((t) => (
          <div key={t.id} className="glass-card p-4 nav:p-6">
            <div className="flex flex-col nav:flex-row nav:items-start nav:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`severity-${t.severity.toLowerCase()} text-xs font-bold uppercase`}>{t.severity}</span>
                  <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                </div>
                <h3 className="font-heading font-semibold text-base nav:text-lg">{t.title}</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1 break-words">{t.testApp.name} · {t.user.email}</p>
                <p className="mt-3 text-sm rich-text-display" dangerouslySetInnerHTML={{ __html: t.description }} />
                {t.screenshotUrl && (
                  <a href={t.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block mt-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.screenshotUrl}
                      alt="Report screenshot"
                      className="rounded-lg border border-[var(--border-color)] max-h-48 nav:max-h-64 w-full nav:w-auto object-contain"
                    />
                  </a>
                )}
              </div>
              <div className="flex flex-row nav:flex-col gap-2 shrink-0">
                {t.status === "OPEN" && (
                  <>
                    <button onClick={() => updateStatus(t.id, "APPROVED")} className="btn-primary text-sm py-1.5">Approve</button>
                    <button onClick={() => updateStatus(t.id, "REJECTED")} className="btn-danger text-sm py-1.5">Reject</button>
                  </>
                )}
                {t.rewardAmount && (
                  <span className="text-[var(--accent-success)] font-semibold text-sm">{formatCurrency(t.rewardAmount)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {issues.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">No issues yet</div>
        )}
    </div>
  );
}

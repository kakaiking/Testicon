"use client";

import { useMemo, useState, useEffect } from "react";
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

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "APPROVED", label: "Paid" },
  { key: "REJECTED", label: "Rejected" },
] as const;

export default function PortalIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/issues")
      .then((r) => r.json())
      .then(setIssues);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return issues;
    if (filter === "APPROVED") {
      return issues.filter((i) => i.status === "APPROVED" || i.status === "PAID");
    }
    return issues.filter((i) => i.status === filter);
  }, [issues, filter]);

  return (
    <div className="hits-page max-w-2xl mx-auto">
      <div className="hits-filters" role="tablist" aria-label="Filter hits">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`hits-filter ${filter === f.key ? "hits-filter-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="hits-timeline">
        {filtered.map((t) => {
          const expanded = openId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`hit-row severity-rail-${t.severity.toLowerCase()} ${expanded ? "hit-row-open" : ""}`}
              onClick={() => setOpenId(expanded ? null : t.id)}
              aria-expanded={expanded}
            >
              <div className="hit-row-top">
                <span className={`severity-${t.severity.toLowerCase()} font-mono text-[0.65rem] font-bold tracking-wide uppercase`}>
                  {t.severity}
                </span>
                <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
              </div>
              <h3 className="font-heading font-semibold text-left mt-1">{t.title}</h3>
              <p className="text-sm text-[var(--text-muted)] text-left">{t.testApp.name}</p>
              {expanded && (
                <div className="hit-row-detail">
                  <p className="font-mono text-xs text-[var(--text-muted)]">
                    {new Date(t.createdAt).toLocaleString()}
                  </p>
                  {t.rewardAmount != null && t.rewardAmount > 0 ? (
                    <p className="text-[var(--accent-success)] text-sm font-semibold mt-1">
                      Reward {formatCurrency(t.rewardAmount)}
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] mt-1">No reward yet</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 px-4">
          <p className="font-heading text-lg font-semibold">
            {issues.length === 0 ? "No hits yet" : "Nothing in this filter"}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {issues.length === 0
              ? "Enter a live app and use Report to log a hit."
              : "Try another filter chip."}
          </p>
        </div>
      )}
    </div>
  );
}

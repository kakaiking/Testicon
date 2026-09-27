"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useSnackbar } from "@/components/Snackbar";

type Reward = {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  user: { email: string };
  issue: { title: string } | null;
};

export default function AdminRewardsPage() {
  const snackbar = useSnackbar();
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    fetch("/api/admin/rewards")
      .then((r) => r.json())
      .then(setRewards);
  }, []);

  async function updateStatus(rewardId: string, status: string) {
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        snackbar.error(data?.error || "Couldn’t update payout");
        return;
      }
      const updated = await fetch("/api/admin/rewards").then((r) => r.json());
      setRewards(updated);
      snackbar.success(status === "PAID" ? "Marked as paid" : "Payout rejected");
    } catch {
      snackbar.error("Couldn’t update payout");
    }
  }

  return (
    <div className="space-y-4">
      {rewards.map((r) => (
        <div
          key={r.id}
          className="glass-card p-4 nav:p-5 flex flex-col nav:flex-row nav:items-center nav:justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="font-medium truncate">{r.user.email}</div>
            <div className="text-sm text-[var(--text-muted)] break-words">
              {r.type === "WITHDRAWAL" ? "Withdrawal request" : r.issue?.title || r.description}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 nav:gap-4 shrink-0">
            <span
              className={`font-heading font-bold ${
                r.type === "CREDIT" ? "text-[var(--accent-success)]" : "text-[var(--accent-warning)]"
              }`}
            >
              {r.type === "WITHDRAWAL" ? "-" : "+"}
              {formatCurrency(r.amount)}
            </span>
            <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
            {r.type === "WITHDRAWAL" && r.status === "PENDING" && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(r.id, "PAID")} className="btn-primary text-sm py-1 px-3">
                  Pay
                </button>
                <button onClick={() => updateStatus(r.id, "REJECTED")} className="btn-danger text-sm py-1 px-3">
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {rewards.length === 0 && (
        <div className="text-center py-16 text-[var(--text-muted)]">No rewards yet</div>
      )}
    </div>
  );
}

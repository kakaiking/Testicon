"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type RewardData = {
  balance: number;
  available: number;
  rewards: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    description: string | null;
    issue: { title: string } | null;
    createdAt: string;
  }>;
};

export default function PortalRewardsPage() {
  const [data, setData] = useState<RewardData | null>(null);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  function load() {
    fetch("/api/portal/rewards").then((r) => r.json()).then(setData);
  }

  useEffect(() => { load(); }, []);

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawing(true);
    const res = await fetch("/api/portal/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    if (res.ok) {
      setAmount("");
      load();
    } else {
      const err = await res.json();
      alert(err.error || "Withdrawal failed");
    }
    setWithdrawing(false);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-4 nav:px-6 py-3 nav:py-4 flex items-center justify-between gap-3">
        <Link href="/portal" className="flex items-center gap-2 min-w-0">
          <span className="text-xl nav:text-2xl shrink-0">🧪</span>
          <span className="font-heading font-bold text-base nav:text-lg truncate">Rewards</span>
        </Link>
        <Link href="/portal" className="btn-secondary text-sm shrink-0">← Apps</Link>
      </header>
      <div className="p-4 nav:p-6 max-w-2xl mx-auto space-y-4 nav:space-y-6">
        <div className="glass-card p-6 nav:p-8 text-center">
          <div className="text-[var(--text-muted)] text-sm">Available Balance</div>
          <div className="font-heading text-3xl nav:text-4xl font-bold text-[var(--accent-success)] mt-2">
            {formatCurrency(data?.available ?? 0)}
          </div>
        </div>

        <form onSubmit={withdraw} className="glass-card p-4 nav:p-6 space-y-4">
          <h2 className="font-heading font-semibold">Withdraw Rewards</h2>
          <div>
            <label className="label">Amount (KSh)</label>
            <input
              className="input-field"
              type="number"
              step="0.01"
              min="0"
              max={data?.available ?? 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={withdrawing || !amount}>
            {withdrawing ? "Processing..." : "Request Withdrawal"}
          </button>
        </form>

        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-color)] font-heading font-semibold">History</div>
          <div className="divide-y divide-[var(--border-color)]">
            {data?.rewards.map((r) => (
              <div key={r.id} className="p-3 nav:p-4 flex flex-col nav:flex-row nav:justify-between nav:items-center gap-2">
                <div>
                  <div className="text-sm">{r.issue?.title || r.description}</div>
                  <span className={`badge badge-${r.status.toLowerCase()} text-xs mt-1`}>{r.status}</span>
                </div>
                <span className={`font-semibold ${r.type === "CREDIT" ? "text-[var(--accent-success)]" : "text-[var(--accent-warning)]"}`}>
                  {r.type === "CREDIT" ? "+" : "-"}{formatCurrency(r.amount)}
                </span>
              </div>
            ))}
            {!data?.rewards.length && (
              <div className="p-8 text-center text-[var(--text-muted)]">No rewards yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { useSnackbar } from "@/components/Snackbar";

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
  const snackbar = useSnackbar();
  const [data, setData] = useState<RewardData | null>(null);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [flash, setFlash] = useState(false);

  function load() {
    fetch("/api/portal/rewards")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawing(true);
    try {
      const res = await fetch("/api/portal/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      if (res.ok) {
        setAmount("");
        setFlash(true);
        window.setTimeout(() => setFlash(false), 1200);
        load();
        snackbar.success("Cash out requested");
      } else {
        const err = await res.json();
        snackbar.error(err.error || "Cash out failed");
      }
    } catch {
      snackbar.error("Cash out failed");
    } finally {
      setWithdrawing(false);
    }
  }

  const pending = Math.max(0, (data?.balance ?? 0) - (data?.available ?? 0));

  return (
    <div className="wallet-page max-w-md mx-auto">
      <div className={`wallet-hero ${flash ? "wallet-hero-flash" : ""}`}>
        <p className="font-mono text-[0.65rem] tracking-[0.16em] text-[var(--sodium)]">AVAILABLE</p>
        <p className="wallet-balance font-heading">{formatCurrency(data?.available ?? 0)}</p>
        <div className="wallet-split">
          <div>
            <span className="access-pass-key">Pending</span>
            <p className="font-mono text-sm mt-0.5">{formatCurrency(pending)}</p>
          </div>
          <div className="text-right">
            <span className="access-pass-key">Ledger</span>
            <p className="font-mono text-sm mt-0.5">{formatCurrency(data?.balance ?? 0)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={withdraw} className="wallet-cashout">
        <label className="label" htmlFor="cashout-amount">
          Cash out (KSh)
        </label>
        <input
          id="cashout-amount"
          className="input-field font-mono"
          type="number"
          step="0.01"
          min="0"
          max={data?.available ?? 0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <button
          type="submit"
          className="btn-primary w-full mt-3"
          disabled={withdrawing || !amount || Number(amount) <= 0}
        >
          {withdrawing ? "Sending…" : "Cash out"}
        </button>
      </form>

      <div className="wallet-ledger">
        <h2 className="font-heading font-semibold text-base mb-2">History</h2>
        <div className="wallet-ledger-list">
          {data?.rewards.map((r) => (
            <div key={r.id} className="wallet-ledger-row">
              <div className="min-w-0">
                <p className="text-sm truncate">{r.issue?.title || r.description || "Reward"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge badge-${r.status.toLowerCase()} text-xs`}>{r.status}</span>
                  <span className="font-mono text-[0.65rem] text-[var(--text-muted)]">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span
                className={`font-mono font-semibold shrink-0 ${
                  r.type === "CREDIT" ? "text-[var(--accent-success)]" : "text-[var(--accent-warning)]"
                }`}
              >
                {r.type === "CREDIT" ? "+" : "−"}
                {formatCurrency(r.amount)}
              </span>
            </div>
          ))}
          {!data?.rewards.length && (
            <p className="text-center text-sm text-[var(--text-muted)] py-8">
              No ledger entries yet — log hits to earn.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

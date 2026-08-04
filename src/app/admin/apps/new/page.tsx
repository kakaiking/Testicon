"use client";

import { useState } from "react";
import Link from "next/link";
import IconUpload from "@/components/IconUpload";
import LaunchUrlInput from "@/components/LaunchUrlInput";
import RichTextEditor from "@/components/RichTextEditor";
import { normalizeLaunchUrl } from "@/lib/launch-url";

export default function NewAppPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    iconUrl: "",
    launchUrl: "",
    internalAppId: "",
    ndaText: "By participating in this test, you agree to keep all information confidential...",
    termsText: "You understand that this is pre-release software and may contain bugs...",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    rewardLow: "5",
    rewardMedium: "15",
    rewardHigh: "50",
    rewardCritical: "100",
    status: "DRAFT",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const launchUrl = normalizeLaunchUrl(form.launchUrl);
    if (!launchUrl) {
      alert("Enter a valid launch URL (e.g. app.example.com)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, launchUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to create app");
        setLoading(false);
        return;
      }
      // Full navigation — soft router.push can stall after client mutations.
      window.location.assign("/admin/apps");
    } catch {
      alert("Failed to create app");
      setLoading(false);
    }
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <>
      <Link href="/admin/apps" className="text-[var(--text-muted)] text-sm hover:text-[var(--text-main)] mb-6 inline-block">
        ← Back to Apps
      </Link>
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4 nav:space-y-6">
        <div className="glass-card p-4 nav:p-6 space-y-4">
          <h2 className="font-heading font-semibold">App Details</h2>
          <div>
            <label className="label">App Name</label>
            <input className="input-field" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">Description</label>
            <RichTextEditor
              value={form.description}
              onChange={(html) => update("description", html)}
              placeholder="What testers should know about this app..."
            />
          </div>
          <div className="grid nav:grid-cols-2 gap-4">
            <div>
              <label className="label">Icon</label>
              <IconUpload value={form.iconUrl} onChange={(url) => update("iconUrl", url)} />
            </div>
            <div>
              <label className="label">Launch URL</label>
              <LaunchUrlInput
                value={form.launchUrl}
                onChange={(url) => update("launchUrl", url)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Internal-App ID (for issue sync)</label>
            <input className="input-field" type="number" value={form.internalAppId} onChange={(e) => update("internalAppId", e.target.value)} placeholder="App ID from Internal-App registry" />
          </div>
        </div>

        <div className="glass-card p-4 nav:p-6 space-y-4">
          <h2 className="font-heading font-semibold">Test Window</h2>
          <div className="grid nav:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input className="input-field" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input-field" type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} required />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 nav:p-6 space-y-4">
          <h2 className="font-heading font-semibold">Agreements</h2>
          <div>
            <label className="label">NDA Text</label>
            <RichTextEditor
              value={form.ndaText}
              onChange={(html) => update("ndaText", html)}
              placeholder="Non-disclosure agreement text..."
            />
          </div>
          <div>
            <label className="label">Terms of Agreement</label>
            <RichTextEditor
              value={form.termsText}
              onChange={(html) => update("termsText", html)}
              placeholder="Terms testers must accept before participating..."
            />
          </div>
        </div>

        <div className="glass-card p-4 nav:p-6 space-y-4">
          <h2 className="font-heading font-semibold">Reward Amounts (KSh)</h2>
          <div className="grid grid-cols-2 nav:grid-cols-4 gap-3 nav:gap-4">
            {(["Low", "Medium", "High", "Critical"] as const).map((level) => (
              <div key={level}>
                <label className="label">{level}</label>
                <input
                  className="input-field"
                  type="number"
                  value={form[`reward${level}` as keyof typeof form]}
                  onChange={(e) => update(`reward${level}`, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col nav:flex-row gap-3">
          <button type="submit" className="btn-primary w-full nav:w-auto" disabled={loading}>
            {loading ? "Creating..." : "Create App"}
          </button>
          <select className="input-field w-auto" value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option value="DRAFT">Testing Phase</option>
            <option value="ACTIVE">Already Launched</option>
          </select>
        </div>
      </form>
    </>
  );
}

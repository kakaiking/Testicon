"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import IconUpload from "@/components/IconUpload";
import LaunchUrlInput from "@/components/LaunchUrlInput";
import { normalizeLaunchUrl } from "@/lib/launch-url";

type App = {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  launchUrl: string;
  internalAppId: number | null;
  ndaText: string;
  termsText: string;
  startDate: string;
  endDate: string;
  rewardLow: number;
  rewardMedium: number;
  rewardHigh: number;
  rewardCritical: number;
  status: string;
};

export default function EditAppPage({ params }: { params: Promise<{ id: string }> }) {
  const [appId, setAppId] = useState("");
  const [form, setForm] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setAppId(id);
      fetch("/api/admin/apps")
        .then((r) => r.json())
        .then((apps: App[]) => {
          const app = apps.find((a) => a.id === id);
          if (app) {
            setForm({
              ...app,
              startDate: app.startDate.slice(0, 10),
              endDate: app.endDate.slice(0, 10),
            });
          }
          setLoading(false);
        });
    });
  }, [params]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const launchUrl = normalizeLaunchUrl(form.launchUrl);
    if (!launchUrl) {
      alert("Enter a valid launch URL (e.g. app.example.com)");
      return;
    }
    setSaving(true);
    await fetch(`/api/admin/apps/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, launchUrl }),
    });
    setSaving(false);
  }

  if (loading) return <div className="text-center text-[var(--text-muted)]">Loading...</div>;
  if (!form) return <div className="text-center">App not found</div>;

  function update(field: keyof App, value: string | number) {
    setForm((f) => f ? { ...f, [field]: value } : f);
  }

  return (
    <>
      <Link href="/admin/apps" className="text-[var(--text-muted)] text-sm hover:text-[var(--text-main)] mb-6 inline-block">
        ← Back to Apps
      </Link>
      <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-4">
        <div className="glass-card p-4 nav:p-6 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input-field" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Icon</label>
            <IconUpload
              value={form.iconUrl ?? ""}
              onChange={(url) => update("iconUrl", url)}
            />
          </div>
          <div>
            <label className="label">Launch URL</label>
            <LaunchUrlInput
              value={form.launchUrl}
              onChange={(url) => update("launchUrl", url)}
              required
            />
          </div>
          <div>
            <label className="label">Internal-App ID</label>
            <input className="input-field" type="number" value={form.internalAppId ?? ""} onChange={(e) => update("internalAppId", e.target.value ? Number(e.target.value) : "")} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="DRAFT">Testing Phase</option>
              <option value="ACTIVE">Already Launched</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full nav:w-auto" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Send, UserX, RotateCw, Trash2, MoreVertical } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

type TestApp = { id: string; name: string };
type Invitation = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  testApp: { name: string };
};

type PendingConfirm =
  | { action: "resend"; invitation: Invitation }
  | { action: "revoke"; invitation: Invitation }
  | { action: "delete"; invitation: Invitation };

function InvitationActionsMenu({
  inv,
  resendingId,
  revokingId,
  deletingId,
  onResend,
  onRevoke,
  onDelete,
}: {
  inv: Invitation;
  resendingId: string | null;
  revokingId: string | null;
  deletingId: string | null;
  onResend: (inv: Invitation) => void;
  onRevoke: (inv: Invitation) => void;
  onDelete: (inv: Invitation) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const busy = resendingId === inv.id || revokingId === inv.id || deletingId === inv.id;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Invitation actions"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 disabled:opacity-50 transition-colors"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[168px] py-1 rounded-lg border border-[var(--border-color)] bg-[#121a2e] shadow-xl shadow-black/40"
        >
          <button
            type="button"
            role="menuitem"
            disabled={resendingId === inv.id}
            onClick={() => {
              setOpen(false);
              onResend(inv);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--text-main)] hover:bg-white/5 disabled:opacity-50"
          >
            <RotateCw size={15} />
            {resendingId === inv.id ? "Sending..." : "Resend"}
          </button>
          {inv.status !== "REVOKED" && (
            <button
              type="button"
              role="menuitem"
              disabled={revokingId === inv.id}
              onClick={() => {
                setOpen(false);
                onRevoke(inv);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-400 hover:bg-white/5 disabled:opacity-50"
            >
              <UserX size={15} />
              {revokingId === inv.id ? "Revoking..." : "Revoke"}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={deletingId === inv.id}
            onClick={() => {
              setOpen(false);
              onDelete(inv);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--text-muted)] hover:text-red-400 hover:bg-white/5 disabled:opacity-50"
          >
            <Trash2 size={15} />
            {deletingId === inv.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminTestersPage() {
  const [apps, setApps] = useState<TestApp[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [testAppId, setTestAppId] = useState("");
  const [sending, setSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  async function refreshInvitations() {
    const res = await fetch("/api/admin/invitations", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) {
      setInvitations(data);
      return;
    }
    setInvitations([]);
  }

  useEffect(() => {
    fetch("/api/admin/apps")
      .then((r) => r.json())
      .then((data) => setApps(Array.isArray(data) ? data : []));
    refreshInvitations();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, testAppId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEmail("");
      setTestAppId("");
      await refreshInvitations();
      setMessage({
        type: "success",
        text: data.emailPreview
          ? `Invitation saved. Email preview logged to server console (EmailJS not configured).`
          : `Invitation sent to ${data.email}.`,
      });
    } else {
      setMessage({ type: "error", text: data.error || "Failed to send invitation." });
    }
    setSending(false);
  }

  async function revokeInvite(inv: Invitation) {
    if (inv.status === "REVOKED") return;

    setRevokingId(inv.id);
    setMessage(null);
    const res = await fetch(`/api/admin/invitations/${inv.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setInvitations((prev) =>
        prev.map((item) =>
          item.id === inv.id ? { ...item, status: data.status ?? "REVOKED" } : item
        )
      );
      await refreshInvitations();
      setMessage({ type: "success", text: `Access revoked for ${inv.email}.` });
    } else {
      setMessage({ type: "error", text: data.error || "Failed to revoke access." });
    }
    setRevokingId(null);
  }

  async function resendInvite(inv: Invitation) {
    setResendingId(inv.id);
    setMessage(null);
    const res = await fetch(`/api/admin/invitations/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refreshInvitations();
      const isAccepted = inv.status === "ACCEPTED";
      let text: string;
      if (data.emailPreview) {
        text = isAccepted
          ? "Access reminder logged to server console (EmailJS not configured)."
          : "Invitation resent. Email preview logged to server console (EmailJS not configured).";
      } else {
        text = isAccepted
          ? `Access reminder sent to ${inv.email}.`
          : `Invitation resent to ${inv.email}.`;
      }
      setMessage({ type: "success", text });
    } else {
      setMessage({ type: "error", text: data.error || "Failed to resend invitation." });
    }
    setResendingId(null);
  }

  async function deleteInvite(inv: Invitation) {
    setDeletingId(inv.id);
    setMessage(null);
    const res = await fetch(`/api/admin/invitations/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refreshInvitations();
      setMessage({ type: "success", text: `Invitation removed from list.` });
    } else {
      setMessage({ type: "error", text: data.error || "Failed to delete invitation." });
    }
    setDeletingId(null);
  }

  function requestRevoke(inv: Invitation) {
    if (inv.status === "REVOKED") return;
    setPendingConfirm({ action: "revoke", invitation: inv });
  }

  function requestResend(inv: Invitation) {
    setPendingConfirm({ action: "resend", invitation: inv });
  }

  function requestDelete(inv: Invitation) {
    setPendingConfirm({ action: "delete", invitation: inv });
  }

  async function handleConfirmAction() {
    if (!pendingConfirm) return;
    const { action, invitation } = pendingConfirm;
    if (action === "resend") await resendInvite(invitation);
    else if (action === "revoke") await revokeInvite(invitation);
    else await deleteInvite(invitation);
    setPendingConfirm(null);
  }

  function renderConfirmModal() {
    if (!pendingConfirm) return null;
    const inv = pendingConfirm.invitation;
    const highlight = (text: string) => (
      <span className="font-medium text-[var(--text-main)]">{text}</span>
    );

    if (pendingConfirm.action === "resend") {
      const isAccepted = inv.status === "ACCEPTED";
      return (
        <ConfirmModal
          open
          variant="default"
          title={isAccepted ? "Resend access reminder?" : "Resend invitation?"}
          description={
            <>
              A new {isAccepted ? "access reminder" : "invitation email"} will be sent to{" "}
              {highlight(inv.email)} for {highlight(inv.testApp.name)}.
            </>
          }
          confirmLabel={isAccepted ? "Send reminder" : "Resend invitation"}
          loading={resendingId === inv.id}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingConfirm(null)}
        />
      );
    }

    if (pendingConfirm.action === "revoke") {
      return (
        <ConfirmModal
          open
          variant="danger"
          title="Revoke tester access?"
          description={
            <>
              {highlight(inv.email)} will lose access to {highlight(inv.testApp.name)}. They can be
              re-invited later.
            </>
          }
          confirmLabel="Revoke access"
          loading={revokingId === inv.id}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingConfirm(null)}
        />
      );
    }

    return (
      <ConfirmModal
        open
        variant="danger"
        title="Remove invitation?"
        description={
          <>
            Remove {highlight(inv.email)}&apos;s invitation to {highlight(inv.testApp.name)} from
            this list? The record will be deleted permanently.
          </>
        }
        confirmLabel="Remove invitation"
        loading={deletingId === inv.id}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingConfirm(null)}
      />
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 nav:space-y-8">
        <form onSubmit={sendInvite} className="glass-card p-4 nav:p-6 space-y-4">
          <h2 className="font-heading font-semibold flex items-center justify-center gap-2 text-base nav:text-lg">
            <Send size={18} /> Send Invitation
          </h2>
          <div className="grid nav:grid-cols-2 gap-4">
            <div>
              <label className="label">Tester Email</label>
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tester@example.com" />
            </div>
            <div>
              <label className="label">App</label>
              <select className="input-field" value={testAppId} onChange={(e) => setTestAppId(e.target.value)} required>
                <option value="">Select app...</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {message.text}
            </p>
          )}
          <div className="flex justify-center">
            <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={sending}>
              <Mail size={16} /> {sending ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>

        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border-color)] font-heading font-semibold text-center">Recent Invitations</div>
          <div className="divide-y divide-[var(--border-color)]">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-3 nav:p-4 flex flex-col nav:flex-row nav:items-center nav:justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{inv.email}</div>
                  <div className="text-sm text-[var(--text-muted)] truncate">{inv.testApp.name}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end nav:self-auto">
                  <span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span>
                  <InvitationActionsMenu
                    inv={inv}
                    resendingId={resendingId}
                    revokingId={revokingId}
                    deletingId={deletingId}
                    onResend={requestResend}
                    onRevoke={requestRevoke}
                    onDelete={requestDelete}
                  />
                </div>
              </div>
            ))}
            {invitations.length === 0 && (
              <div className="p-8 text-center text-[var(--text-muted)]">No invitations sent yet</div>
            )}
          </div>
        </div>
      </div>
      {renderConfirmModal()}
    </>
  );
}

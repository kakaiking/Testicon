import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FlaskConical, Users, CircleAlert, Wallet } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login");

  const [apps, testers, openIssues, pendingRewards] = await Promise.all([
    prisma.testApp.count(),
    prisma.user.count({ where: { role: "TESTER" } }),
    prisma.issue.count({ where: { status: "OPEN" } }),
    prisma.reward.count({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Active apps", value: apps, icon: FlaskConical, href: "/admin/apps", tone: "text-[var(--text-main)]" },
    { label: "Testers", value: testers, icon: Users, href: "/admin/testers", tone: "text-[var(--trace)]" },
    { label: "Open hits", value: openIssues, icon: CircleAlert, href: "/admin/issues", tone: "text-[var(--sodium)]" },
    { label: "Payout queue", value: pendingRewards, icon: Wallet, href: "/admin/rewards", tone: "text-[var(--accent)]" },
  ];

  return (
    <>
      <p className="font-mono text-[0.65rem] tracking-[0.14em] text-[var(--text-muted)] mb-4">
        LIVE RAID BOARD
      </p>
      <div className="grid nav:grid-cols-2 gap-3 nav:gap-4">
        {stats.map(({ label, value, icon: Icon, href, tone }) => (
          <Link key={label} href={href} className="glass-card p-4 nav:p-5 transition-colors hover:border-[rgba(255,59,48,0.35)]">
            <Icon className={`${tone} mb-2`} size={22} />
            <div className="text-2xl nav:text-3xl font-heading font-bold tracking-tight">{value}</div>
            <div className="text-[var(--text-muted)] text-sm mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 nav:mt-8 glass-card p-4 nav:p-5">
        <h2 className="font-heading text-base font-semibold mb-3">Quick actions</h2>
        <div className="flex flex-col nav:flex-row flex-wrap gap-2 nav:gap-3">
          <Link href="/admin/apps/new" className="btn-primary">
            Create app
          </Link>
          <Link href="/admin/testers" className="btn-secondary">
            Invite testers
          </Link>
          <Link href="/admin/issues" className="btn-secondary">
            Review hits
          </Link>
        </div>
      </div>
    </>
  );
}

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
    { label: "Apps", value: apps, icon: FlaskConical, href: "/admin/apps", color: "text-indigo-400" },
    { label: "Testers", value: testers, icon: Users, href: "/admin/testers", color: "text-emerald-400" },
    { label: "Open Issues", value: openIssues, icon: CircleAlert, href: "/admin/issues", color: "text-amber-400" },
    { label: "Pending Payouts", value: pendingRewards, icon: Wallet, href: "/admin/rewards", color: "text-pink-400" },
  ];

  return (
    <>
      <div className="grid nav:grid-cols-2 gap-4 nav:gap-6">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="glass-card p-4 nav:p-6 hover:scale-[1.02] transition-transform">
            <Icon className={`${color} mb-2 nav:mb-3`} size={24} />
            <div className="text-2xl nav:text-3xl font-heading font-bold">{value}</div>
            <div className="text-[var(--text-muted)] text-sm mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 nav:mt-10 glass-card p-4 nav:p-6">
        <h2 className="font-heading text-base nav:text-lg font-semibold mb-3 nav:mb-4">Quick Actions</h2>
        <div className="flex flex-col nav:flex-row flex-wrap gap-2 nav:gap-3">
          <Link href="/admin/apps/new" className="btn-primary">Create App</Link>
          <Link href="/admin/testers" className="btn-secondary">Invite Testers</Link>
          <Link href="/admin/issues" className="btn-secondary">Review Issues</Link>
        </div>
      </div>
    </>
  );
}

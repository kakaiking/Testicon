import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { htmlToPlainText, formatAppStatus } from "@/lib/utils";

export default async function AdminAppsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login");

  const apps = await prisma.testApp.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div className="flex flex-col nav:flex-row nav:justify-between nav:items-center gap-3 mb-4 nav:mb-6">
        <p className="text-[var(--text-muted)] text-sm nav:text-base">Manage apps available for testing</p>
        <Link href="/admin/apps/new" className="btn-primary inline-flex items-center justify-center gap-2 w-full nav:w-auto">
          <Plus size={18} /> New App
        </Link>
      </div>

      <div className="grid nav:grid-cols-2 gap-4 nav:gap-6">
        {apps.map((app) => (
          <div key={app.id} className="glass-card p-4 nav:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-2xl shrink-0">
                {app.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.iconUrl} alt="" className="w-8 h-8 rounded" />
                ) : (
                  "🧪"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold truncate">{app.name}</h3>
                <p className="text-sm text-[var(--text-muted)] line-clamp-2 mt-1">{htmlToPlainText(app.description ?? "")}</p>
              </div>
            </div>
            <div className="flex flex-col nav:flex-row nav:items-center nav:justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
              <span className={`badge badge-${app.status.toLowerCase()} w-fit`}>{formatAppStatus(app.status)}</span>
              <div className="flex gap-2">
                <Link href={`/admin/apps/${app.id}`} className="btn-secondary text-sm py-1.5 px-3">
                  Edit
                </Link>
                {app.launchUrl && (
                  <a href={app.launchUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-1.5 px-3">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <div className="col-span-full text-center py-16 text-[var(--text-muted)]">
            No apps yet. Create your first one to get started.
          </div>
        )}
      </div>
    </>
  );
}

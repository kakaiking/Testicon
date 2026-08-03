import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TesterShell } from "@/components/Shell";
import Link from "next/link";
import { isAppActive, htmlToPlainText, formatAppStatus } from "@/lib/utils";

export default async function PortalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const enrollments = await prisma.testerEnrollment.findMany({
    where: { userId: session.id },
    include: { testApp: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <TesterShell user={session} title="My Test Apps">
      <div className="grid nav:grid-cols-2 gap-4 nav:gap-6 max-w-6xl mx-auto">
        {enrollments.map(({ testApp, status }) => {
          const inTestWindow = isAppActive(testApp.startDate, testApp.endDate);
          const appIsLive = testApp.status === "ACTIVE";
          const canLaunch = status === "ACTIVE" && inTestWindow && appIsLive;

          return (
            <div key={testApp.id} className="glass-card p-4 nav:p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-3xl">
                  {testApp.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={testApp.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    "🧪"
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-semibold">{testApp.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`badge badge-${status === "ACTIVE" ? "active" : "pending"} text-xs`}>
                      {status.replace(/_/g, " ")}
                    </span>
                    {status === "ACTIVE" && !appIsLive && (
                      <span className="badge badge-pending text-xs">{formatAppStatus(testApp.status)}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-4">{htmlToPlainText(testApp.description ?? "")}</p>
              {status === "ACTIVE" && !inTestWindow && (
                <p className="text-xs text-[var(--accent-warning)] mb-3">
                  Test window: {testApp.startDate.toLocaleDateString()} – {testApp.endDate.toLocaleDateString()}
                </p>
              )}
              {status === "ACTIVE" && inTestWindow && !appIsLive && (
                <p className="text-xs text-[var(--accent-warning)] mb-3">
                  {testApp.status === "CLOSED"
                    ? "This test has ended."
                    : "The app is not live yet. An admin must mark it as launched before you can test."}
                </p>
              )}
              {canLaunch ? (
                <Link href={`/portal/apps/${testApp.id}/launch`} className="btn-primary w-full text-center block">
                  Launch App
                </Link>
              ) : status !== "ACTIVE" ? (
                <Link href={`/portal/apps/${testApp.id}/onboard`} className="btn-secondary w-full text-center block">
                  Complete Setup
                </Link>
              ) : (
                <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
                  {testApp.status === "CLOSED"
                    ? "Test Closed"
                    : !inTestWindow
                      ? "Outside Test Window"
                      : "Not Live Yet"}
                </button>
              )}
            </div>
          );
        })}
        {enrollments.length === 0 && (
          <div className="col-span-full text-center py-16 text-[var(--text-muted)]">
            No test apps assigned. Check your email for an invitation link.
          </div>
        )}
      </div>
    </TesterShell>
  );
}

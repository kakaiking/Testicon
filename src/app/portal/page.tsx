import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { isEnrollmentInWindow, resolveAccessWindow, htmlToPlainText } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";

function missionStatus(opts: {
  enrollmentStatus: string;
  inWindow: boolean;
  closed: boolean;
}): { key: string; label: string } {
  if (opts.enrollmentStatus !== "ACTIVE") return { key: "onboard", label: "ONBOARD" };
  if (opts.closed) return { key: "ended", label: "ENDED" };
  if (!opts.inWindow) return { key: "locked", label: "LOCKED" };
  return { key: "live", label: "LIVE" };
}

function windowProgress(start: Date, end: Date) {
  const now = Date.now();
  const a = start.getTime();
  const b = end.getTime();
  if (b <= a) return 1;
  return Math.min(1, Math.max(0, (now - a) / (b - a)));
}

export default async function PortalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const enrollments = await prisma.testerEnrollment.findMany({
    where: { userId: session.id },
    include: { testApp: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mission-list max-w-2xl mx-auto">
      {enrollments.map((enrollment) => {
        const { testApp, status } = enrollment;
        const window = resolveAccessWindow(enrollment, testApp);
        const inTestWindow = isEnrollmentInWindow(enrollment, testApp);
        const isClosed = testApp.status === "CLOSED";
        const canLaunch = status === "ACTIVE" && inTestWindow && !isClosed;
        const mission = missionStatus({
          enrollmentStatus: status,
          inWindow: inTestWindow,
          closed: isClosed,
        });
        const progress = windowProgress(window.start, window.end);
        const href = canLaunch
          ? `/portal/apps/${testApp.id}/launch`
          : status !== "ACTIVE"
            ? `/portal/apps/${testApp.id}/onboard`
            : undefined;

        const inner = (
          <>
            <div className="mission-row-main">
              <div className="mission-icon">
                {testApp.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={testApp.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BrandMark size={26} className="text-[var(--text-main)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold truncate">{testApp.name}</h3>
                  <span className={`mission-chip mission-chip-${mission.key}`}>{mission.label}</span>
                </div>
                <p className="text-sm text-[var(--text-muted)] line-clamp-1 mt-0.5">
                  {htmlToPlainText(testApp.description ?? "") || "No description"}
                </p>
                <div className="mission-window mt-2" aria-hidden>
                  <div className="mission-window-track">
                    <div className="mission-window-fill" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <p className="mission-window-dates font-mono">
                    {window.start.toLocaleDateString()} – {window.end.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="mission-row-cta">
              {canLaunch ? (
                <span className="text-sm font-semibold text-[var(--accent)]">Enter →</span>
              ) : status !== "ACTIVE" ? (
                <span className="text-sm font-semibold text-[var(--text-main)]">Set up →</span>
              ) : (
                <span className="text-sm text-[var(--text-muted)]">
                  {isClosed ? "Closed" : "Outside window"}
                </span>
              )}
            </div>
          </>
        );

        if (href) {
          return (
            <Link key={testApp.id} href={href} className="mission-row">
              {inner}
            </Link>
          );
        }

        return (
          <div key={testApp.id} className="mission-row mission-row-disabled">
            {inner}
          </div>
        );
      })}

      {enrollments.length === 0 && (
        <div className="text-center py-16 px-4">
          <p className="font-heading text-lg font-semibold">No missions yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Check your email for an invite link to get on the list.
          </p>
        </div>
      )}
    </div>
  );
}

import type { IssueSeverity } from "@/lib/types";

export function getRewardForSeverity(
  severity: IssueSeverity,
  app: {
    rewardLow: number;
    rewardMedium: number;
    rewardHigh: number;
    rewardCritical: number;
  }
): number {
  switch (severity) {
    case "LOW":
      return app.rewardLow;
    case "MEDIUM":
      return app.rewardMedium;
    case "HIGH":
      return app.rewardHigh;
    case "CRITICAL":
      return app.rewardCritical;
    default:
      return app.rewardMedium;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAppStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Testing Phase";
    case "ACTIVE":
      return "Already Launched";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

export function isAppActive(startDate: Date, endDate: Date): boolean {
  const now = new Date();
  return now >= startDate && now <= endDate;
}

/** Parse YYYY-MM-DD as UTC start of day. */
export function parseDateOnlyStart(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/** Parse YYYY-MM-DD as UTC end of day (inclusive). */
export function parseDateOnlyEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

export function resolveAccessWindow(
  enrollment: { accessStart: Date | null; accessEnd: Date | null },
  app: { startDate: Date; endDate: Date }
): { start: Date; end: Date } {
  return {
    start: enrollment.accessStart ?? app.startDate,
    end: enrollment.accessEnd ?? app.endDate,
  };
}

export function isEnrollmentInWindow(
  enrollment: { accessStart: Date | null; accessEnd: Date | null },
  app: { startDate: Date; endDate: Date }
): boolean {
  const { start, end } = resolveAccessWindow(enrollment, app);
  return isAppActive(start, end);
}

export function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export const INVITATION_EXPIRY_HOURS = 48;

export function getInvitationExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);
  return expiresAt;
}

export function getInvitationExpiryText(): string {
  return `${INVITATION_EXPIRY_HOURS} hours`;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

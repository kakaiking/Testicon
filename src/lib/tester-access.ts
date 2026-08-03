import { prisma } from "@/lib/db";
import type { TestApp, TesterEnrollment } from "@prisma/client";

type EnrollmentWithApp = TesterEnrollment & { testApp: TestApp };

export async function filterAccessibleEnrollments(
  email: string,
  enrollments: EnrollmentWithApp[]
): Promise<EnrollmentWithApp[]> {
  if (enrollments.length === 0) return [];

  const normalizedEmail = email.trim().toLowerCase();
  const testAppIds = enrollments.map((e) => e.testAppId);

  const invitations = await prisma.invitation.findMany({
    where: {
      email: normalizedEmail,
      testAppId: { in: testAppIds },
      status: { not: "REVOKED" },
      deletedAt: null,
    },
    select: { testAppId: true },
  });

  const allowedAppIds = new Set(invitations.map((i) => i.testAppId));
  return enrollments.filter((e) => allowedAppIds.has(e.testAppId));
}

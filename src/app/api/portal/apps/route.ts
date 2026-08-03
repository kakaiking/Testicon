import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { filterAccessibleEnrollments } from "@/lib/tester-access";
import { isAppActive } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireSession();
    const allEnrollments = await prisma.testerEnrollment.findMany({
      where: { userId: session.id },
      include: { testApp: true },
      orderBy: { createdAt: "desc" },
    });
    const enrollments = await filterAccessibleEnrollments(session.email, allEnrollments);

    const apps = enrollments.map((e) => ({
      ...e.testApp,
      enrollment: {
        id: e.id,
        status: e.status,
        ndaAcceptedAt: e.ndaAcceptedAt,
        termsAcceptedAt: e.termsAcceptedAt,
        understandingText: e.understandingText,
      },
      isActive: isAppActive(e.testApp.startDate, e.testApp.endDate),
    }));

    return NextResponse.json(apps);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

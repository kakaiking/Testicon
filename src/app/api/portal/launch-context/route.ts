import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createLaunchToken } from "@/lib/embed-protocol";
import { isAppActive } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const testAppId = searchParams.get("testAppId");

    if (!testAppId) {
      return NextResponse.json({ error: "testAppId required" }, { status: 400 });
    }

    const enrollment = await prisma.testerEnrollment.findUnique({
      where: { userId_testAppId: { userId: session.id, testAppId } },
      include: { testApp: true },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    const app = enrollment.testApp;
    if (app.status !== "ACTIVE" || !isAppActive(app.startDate, app.endDate)) {
      return NextResponse.json({ error: "App unavailable" }, { status: 403 });
    }

    const { token, expiresAt } = await createLaunchToken({
      tester: {
        id: session.id,
        email: session.email,
        name: session.name,
      },
      app: { id: app.id, name: app.name },
    });

    return NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        launchUrl: app.launchUrl,
      },
      context: {
        token,
        tester: {
          id: session.id,
          email: session.email,
          name: session.name,
        },
        app: { id: app.id, name: app.name },
        expiresAt,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

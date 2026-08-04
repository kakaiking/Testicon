import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkEmbeddability } from "@/lib/embed-check";
import { isAppActive } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams, origin } = new URL(req.url);
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
    if (app.status === "CLOSED" || !isAppActive(app.startDate, app.endDate)) {
      return NextResponse.json({ error: "App unavailable" }, { status: 403 });
    }

    const result = await checkEmbeddability(app.launchUrl, origin);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

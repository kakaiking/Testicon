import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncIssueToInternalApp } from "@/lib/internal-app-sync";
import { saveScreenshot } from "@/lib/screenshot-storage";
import { htmlToPlainText } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireSession();
    const issues = await prisma.issue.findMany({
      where: { userId: session.id },
      include: { testApp: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(issues);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { testAppId, title, description, severity, screenshot } = await request.json();

    const enrollment = await prisma.testerEnrollment.findUnique({
      where: { userId_testAppId: { userId: session.id, testAppId } },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json({ error: "App access not granted" }, { status: 403 });
    }

    const testApp = await prisma.testApp.findUnique({ where: { id: testAppId } });
    if (!testApp) return NextResponse.json({ error: "App not found" }, { status: 404 });

    let screenshotUrl: string | null = null;
    if (typeof screenshot === "string" && screenshot.startsWith("data:image/")) {
      screenshotUrl = await saveScreenshot(screenshot);
    }

    const issue = await prisma.issue.create({
      data: {
        userId: session.id,
        testAppId,
        title,
        description,
        severity: severity || "MEDIUM",
        screenshotUrl,
      },
    });

    if (testApp.internalAppId) {
      const plainDescription = htmlToPlainText(issue.description);
      const syncDescription = screenshotUrl
        ? `${plainDescription}\n\nScreenshot: ${screenshotUrl}`
        : plainDescription;
      const sync = await syncIssueToInternalApp({
        internalAppId: testApp.internalAppId,
        issueId: issue.id,
        title: issue.title,
        description: syncDescription,
        severity: issue.severity,
        author: session.email,
      });
      if (sync.synced) {
        await prisma.issue.update({
          where: { id: issue.id },
          data: {
            internalSyncedAt: new Date(),
            internalIssueId: sync.internalIssueId,
          },
        });
      }
    }

    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}

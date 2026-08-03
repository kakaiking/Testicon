import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRewardForSeverity } from "@/lib/utils";
import { syncIssueToInternalApp } from "@/lib/internal-app-sync";

export async function GET() {
  try {
    await requireAdmin();
    const issues = await prisma.issue.findMany({
      include: {
        user: { select: { email: true, name: true } },
        testApp: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(issues);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { issueId, status } = await request.json();

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { testApp: true, user: true },
    });
    if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: { status },
    });

    if (status === "APPROVED" && !issue.rewardAmount) {
      const amount = getRewardForSeverity(issue.severity as import("@/lib/types").IssueSeverity, issue.testApp);
      await prisma.issue.update({
        where: { id: issueId },
        data: { rewardAmount: amount },
      });
      await prisma.reward.create({
        data: {
          userId: issue.userId,
          issueId: issue.id,
          amount,
          type: "CREDIT",
          status: "APPROVED",
          description: `Reward for ${issue.severity} issue: ${issue.title}`,
        },
      });
    }

    if (issue.testApp.internalAppId && !issue.internalSyncedAt) {
      const sync = await syncIssueToInternalApp({
        internalAppId: issue.testApp.internalAppId,
        issueId: issue.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        author: issue.user.email,
      });
      if (sync.synced) {
        await prisma.issue.update({
          where: { id: issueId },
          data: {
            internalSyncedAt: new Date(),
            internalIssueId: sync.internalIssueId,
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

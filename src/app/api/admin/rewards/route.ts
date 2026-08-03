import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const rewards = await prisma.reward.findMany({
      include: { user: { select: { email: true } }, issue: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rewards);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { rewardId, status } = await request.json();

    const reward = await prisma.reward.update({
      where: { id: rewardId },
      data: { status },
    });

    return NextResponse.json(reward);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

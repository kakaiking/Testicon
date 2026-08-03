import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();
    const rewards = await prisma.reward.findMany({
      where: { userId: session.id },
      include: { issue: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });

    const credits = rewards
      .filter((r) => r.type === "CREDIT" && r.status === "APPROVED")
      .reduce((sum, r) => sum + r.amount, 0);
    const withdrawn = rewards
      .filter((r) => r.type === "WITHDRAWAL" && r.status !== "REJECTED")
      .reduce((sum, r) => sum + r.amount, 0);
    const pending = rewards
      .filter((r) => r.type === "WITHDRAWAL" && r.status === "PENDING")
      .reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      rewards,
      balance: credits - withdrawn,
      available: credits - withdrawn - pending,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { amount } = await request.json();

    const rewards = await prisma.reward.findMany({ where: { userId: session.id } });
    const credits = rewards
      .filter((r) => r.type === "CREDIT" && r.status === "APPROVED")
      .reduce((sum, r) => sum + r.amount, 0);
    const withdrawn = rewards
      .filter((r) => r.type === "WITHDRAWAL" && r.status !== "REJECTED")
      .reduce((sum, r) => sum + r.amount, 0);
    const available = credits - withdrawn;

    if (amount <= 0 || amount > available) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const withdrawal = await prisma.reward.create({
      data: {
        userId: session.id,
        amount,
        type: "WITHDRAWAL",
        status: "PENDING",
        description: "Withdrawal request",
      },
    });

    return NextResponse.json(withdrawal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
  }
}

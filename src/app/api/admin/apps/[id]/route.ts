import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const app = await prisma.testApp.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.iconUrl !== undefined && { iconUrl: body.iconUrl }),
        ...(body.launchUrl !== undefined && { launchUrl: body.launchUrl }),
        ...(body.internalAppId !== undefined && { internalAppId: body.internalAppId ? Number(body.internalAppId) : null }),
        ...(body.ndaText !== undefined && { ndaText: body.ndaText }),
        ...(body.termsText !== undefined && { termsText: body.termsText }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        ...(body.rewardLow !== undefined && { rewardLow: Number(body.rewardLow) }),
        ...(body.rewardMedium !== undefined && { rewardMedium: Number(body.rewardMedium) }),
        ...(body.rewardHigh !== undefined && { rewardHigh: Number(body.rewardHigh) }),
        ...(body.rewardCritical !== undefined && { rewardCritical: Number(body.rewardCritical) }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json(app);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.testApp.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

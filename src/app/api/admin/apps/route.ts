import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const apps = await prisma.testApp.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(apps);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    const app = await prisma.testApp.create({
      data: {
        name: body.name,
        description: body.description || "",
        iconUrl: body.iconUrl || null,
        launchUrl: body.launchUrl,
        internalAppId: body.internalAppId ? Number(body.internalAppId) : null,
        ndaText: body.ndaText || "",
        termsText: body.termsText || "",
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        rewardLow: Number(body.rewardLow ?? 5),
        rewardMedium: Number(body.rewardMedium ?? 15),
        rewardHigh: Number(body.rewardHigh ?? 50),
        rewardCritical: Number(body.rewardCritical ?? 100),
        status: body.status || "DRAFT",
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create app" }, { status: 500 });
  }
}

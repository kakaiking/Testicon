import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One-time remote DB bootstrap after Turso env vars are set on Vercel. */
export async function POST(request: Request) {
  const secret = request.headers.get("x-setup-secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set" },
      { status: 503 },
    );
  }

  try {
    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TURSO_DATABASE_URL,
      },
      stdio: "pipe",
    });

    const adminEmail = (process.env.ADMIN_EMAILS || "admin@hackstreetboys.com")
      .split(",")[0]
      .trim();

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: { email: adminEmail, role: "ADMIN", name: "Admin" },
    });

    await prisma.testApp.upsert({
      where: { id: "seed-app-1" },
      update: {},
      create: {
        id: "seed-app-1",
        name: "Internal Portal Demo",
        description:
          "Test the HackstreetBoys internal portal shell. Report any UI bugs, broken links, or layout issues.",
        iconUrl: "",
        launchUrl: "https://kakaiking.github.io/Internal-App/index.html",
        internalAppId: null,
        ndaText: "NDA placeholder — update in admin.",
        termsText: "Terms placeholder — update in admin.",
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 86400000),
        rewardLow: 5,
        rewardMedium: 15,
        rewardHigh: 50,
        rewardCritical: 100,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true, adminEmail });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

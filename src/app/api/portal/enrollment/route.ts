import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { testAppId, ndaAccepted, termsAccepted, understandingText } = await request.json();

    const enrollment = await prisma.testerEnrollment.findUnique({
      where: { userId_testAppId: { userId: session.id, testAppId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};

    if (ndaAccepted) {
      data.ndaAcceptedAt = new Date();
      data.status = "NDA_SIGNED";
    }
    if (termsAccepted) {
      data.termsAcceptedAt = new Date();
      if (!ndaAccepted) data.status = "NDA_SIGNED";
    }
    if (understandingText) {
      data.understandingText = understandingText;
      data.status = "UNDERSTANDING_SUBMITTED";
    }
    if (ndaAccepted && termsAccepted && understandingText) {
      data.status = "ACTIVE";
    }

    const updated = await prisma.testerEnrollment.update({
      where: { id: enrollment.id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

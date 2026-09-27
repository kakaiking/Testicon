import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import {
  generateToken,
  getInvitationExpiresAt,
  getInvitationExpiryText,
  parseDateOnlyEnd,
  parseDateOnlyStart,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { email, testAppId, accessStart, accessEnd } = await request.json();

    if (!email || !testAppId) {
      return NextResponse.json({ error: "Email and testAppId required" }, { status: 400 });
    }
    if (!accessStart || !accessEnd) {
      return NextResponse.json({ error: "Access start and end dates required" }, { status: 400 });
    }

    const start = parseDateOnlyStart(String(accessStart));
    const end = parseDateOnlyEnd(String(accessEnd));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Invalid access window" }, { status: 400 });
    }

    const testApp = await prisma.testApp.findUnique({ where: { id: testAppId } });
    if (!testApp) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const token = generateToken();
    const expiresAt = getInvitationExpiresAt();
    const normalizedEmail = email.trim().toLowerCase();

    const invitation = await prisma.invitation.create({
      data: {
        email: normalizedEmail,
        token,
        testAppId,
        invitedBy: admin.id,
        expiresAt,
        accessStart: start,
        accessEnd: end,
      },
    });

    // Keep existing enrollments in sync so re-invites unlock without re-accept.
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      await prisma.testerEnrollment.updateMany({
        where: { userId: existingUser.id, testAppId },
        data: { accessStart: start, accessEnd: end },
      });
    }

    const appUrl = getAppUrl();
    const inviteUrl = `${appUrl}/invite/${token}`;

    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      appName: testApp.name,
      inviteUrl,
      inviterEmail: admin.email,
      expiresIn: getInvitationExpiryText(),
    }).catch((err) => {
      console.error("Invitation email failed:", err);
      return { preview: true, emailError: true as const };
    });

    return NextResponse.json(
      {
        ...invitation,
        emailPreview: emailResult.preview,
        emailError: "emailError" in emailResult ? true : undefined,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invitations = await prisma.invitation.findMany({
      where: { deletedAt: null },
      include: { testApp: true, inviter: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invitations, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { generateToken, getInvitationExpiresAt, getInvitationExpiryText } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { email, testAppId } = await request.json();

    if (!email || !testAppId) {
      return NextResponse.json({ error: "Email and testAppId required" }, { status: 400 });
    }

    const testApp = await prisma.testApp.findUnique({ where: { id: testAppId } });
    if (!testApp) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const token = generateToken();
    const expiresAt = getInvitationExpiresAt();

    const invitation = await prisma.invitation.create({
      data: {
        email: email.trim().toLowerCase(),
        token,
        testAppId,
        invitedBy: admin.id,
        expiresAt,
      },
    });

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

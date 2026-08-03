import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { generateToken, getInvitationExpiresAt, getInvitationExpiryText } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action } = await request.json();

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: { testApp: true },
    });

    if (!invitation || invitation.deletedAt) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (action === "resend") {
      const appUrl = getAppUrl();

      if (invitation.status === "ACCEPTED") {
        const portalUrl = `${appUrl}/portal`;
        const emailResult = await sendInvitationEmail({
          to: invitation.email,
          appName: invitation.testApp.name,
          inviteUrl: portalUrl,
          inviterEmail: admin.email,
        });

        return NextResponse.json({
          ...invitation,
          emailPreview: emailResult.preview,
        });
      }

      const token = generateToken();
      const expiresAt = getInvitationExpiresAt();

      const updated = await prisma.invitation.update({
        where: { id },
        data: {
          token,
          expiresAt,
          status: "PENDING",
          acceptedAt: null,
        },
      });

      const inviteUrl = `${appUrl}/invite/${token}`;

      const emailResult = await sendInvitationEmail({
        to: invitation.email,
        appName: invitation.testApp.name,
        inviteUrl,
        inviterEmail: admin.email,
        expiresIn: getInvitationExpiryText(),
      });

      return NextResponse.json({
        ...updated,
        emailPreview: emailResult.preview,
      });
    }

    if (action === "delete") {
      await prisma.invitation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update invitation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.deletedAt) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (invitation.status === "REVOKED") {
      return NextResponse.json({ error: "Invitation already revoked" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: invitation.email } });

    await prisma.$transaction([
      prisma.invitation.update({
        where: { id },
        data: { status: "REVOKED" },
      }),
      ...(user
        ? [
            prisma.testerEnrollment.deleteMany({
              where: { userId: user.id, testAppId: invitation.testAppId },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }
}

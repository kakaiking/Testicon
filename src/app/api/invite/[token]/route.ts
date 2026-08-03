import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, findOrCreateUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { testApp: true },
  });

  if (!invitation || invitation.deletedAt) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  }
  if (invitation.status === "ACCEPTED") {
    return NextResponse.json({ error: "Already accepted", invitation });
  }
  if (invitation.status === "REVOKED") {
    return NextResponse.json({ error: "Invitation revoked" }, { status: 410 });
  }
  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invitation.email,
    appName: invitation.testApp.name,
    testAppId: invitation.testAppId,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { testApp: true },
  });

  if (!invitation || invitation.deletedAt || invitation.status === "REVOKED" || new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  const user = await findOrCreateUser(invitation.email);

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  await prisma.testerEnrollment.upsert({
    where: { userId_testAppId: { userId: user.id, testAppId: invitation.testAppId } },
    update: { status: "REGISTERED" },
    create: { userId: user.id, testAppId: invitation.testAppId, status: "REGISTERED" },
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as import("@/lib/types").Role,
  });

  return NextResponse.json({
    ok: true,
    redirect: `/portal/apps/${invitation.testAppId}/onboard`,
  });
}

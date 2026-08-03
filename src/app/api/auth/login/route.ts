import { NextResponse } from "next/server";
import { createSession, findOrCreateUser, isAdminEmail } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, portal } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const user = await findOrCreateUser(normalized);

    if (portal === "admin") {
      if (!isAdminEmail(normalized)) {
        return NextResponse.json(
          { error: "This email is not authorized for admin access" },
          { status: 403 }
        );
      }
      await createSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: "ADMIN",
      });
      return NextResponse.json({ ok: true, redirect: "/admin" });
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "TESTER",
    });
    return NextResponse.json({ ok: true, redirect: "/portal" });
  } catch {
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}

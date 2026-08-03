import { NextResponse } from "next/server";
import { verifyLaunchToken } from "@/lib/embed-protocol";

/**
 * Public endpoint for embedded app backends to verify a launch token
 * issued by Testicon when a tester opens an app.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      return NextResponse.json({ valid: false, error: "token required" }, { status: 400 });
    }

    const claims = await verifyLaunchToken(token);
    if (!claims) {
      return NextResponse.json({ valid: false, error: "invalid or expired token" }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      tester: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
      },
      app: {
        id: claims.appId,
        name: claims.appName,
      },
    });
  } catch {
    return NextResponse.json({ valid: false, error: "invalid request" }, { status: 400 });
  }
}

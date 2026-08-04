import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { injectEmbedSupport, inlineLaunchStylesheets, resolveProxiedTargetUrl } from "@/lib/embed-proxy";
import { isAppActive } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams, origin } = new URL(req.url);
    const testAppId = searchParams.get("testAppId");

    if (!testAppId) {
      return NextResponse.json({ error: "testAppId required" }, { status: 400 });
    }

    const enrollment = await prisma.testerEnrollment.findUnique({
      where: { userId_testAppId: { userId: session.id, testAppId } },
      include: { testApp: true },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    const app = enrollment.testApp;
    if (app.status === "CLOSED" || !isAppActive(app.startDate, app.endDate)) {
      return NextResponse.json({ error: "App unavailable" }, { status: 403 });
    }

    const path = searchParams.get("path");
    const targetUrl = resolveProxiedTargetUrl(app.launchUrl, path);

    const upstream = await fetch(targetUrl, { redirect: "follow" });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to load app" }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const looksLikeHtml =
      contentType.includes("text/html") ||
      !path ||
      path.endsWith(".html") ||
      path.endsWith("/");

    if (!looksLikeHtml) {
      const body = await upstream.arrayBuffer();
      return new NextResponse(body, {
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    }

    const html = await upstream.text();
    const styled = await inlineLaunchStylesheets(html, app.launchUrl, path);
    const proxied = injectEmbedSupport(styled, app.launchUrl, origin, testAppId, path);

    return new NextResponse(proxied, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

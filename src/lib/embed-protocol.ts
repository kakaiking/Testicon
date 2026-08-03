import { SignJWT, jwtVerify } from "jose";

export const EMBED_PROTOCOL_VERSION = 1;

export const EMBED_MESSAGE = {
  READY: "testicon:ready",
  CONTEXT: "testicon:context",
  LOGOUT: "testicon:logout",
  REQUEST_CONTEXT: "testicon:request-context",
  REQUEST_SCREENSHOT: "testicon:request-screenshot",
  SCREENSHOT: "testicon:screenshot",
} as const;

export type EmbedScreenshotPayload = {
  dataUrl?: string;
  error?: string;
};

export type EmbedTester = {
  id: string;
  email: string;
  name: string | null;
};

export type EmbedApp = {
  id: string;
  name: string;
};

export type EmbedContextPayload = {
  token: string;
  tester: EmbedTester;
  app: EmbedApp;
  expiresAt: number;
};

export type LaunchTokenClaims = {
  sub: string;
  email: string;
  name: string | null;
  appId: string;
  appName: string;
  typ: "launch";
};

const LAUNCH_TOKEN_TTL_SEC = 15 * 60;

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "testicon-dev-secret"
  );
}

export function embedLogoutKey(appId: string) {
  return `testicon_embed_logout_${appId}`;
}

export function launchUrlOrigin(launchUrl: string): string | null {
  try {
    return new URL(launchUrl).origin;
  } catch {
    return null;
  }
}

export function iframeSrcOrigin(iframeSrc: string): string | null {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(iframeSrc, base).origin;
  } catch {
    return null;
  }
}

export async function createLaunchToken(input: {
  tester: EmbedTester;
  app: EmbedApp;
}): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + LAUNCH_TOKEN_TTL_SEC;

  const token = await new SignJWT({
    email: input.tester.email,
    name: input.tester.name,
    appId: input.app.id,
    appName: input.app.name,
    typ: "launch",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.tester.id)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());

  return { token, expiresAt: expiresAt * 1000 };
}

export async function verifyLaunchToken(token: string): Promise<LaunchTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.typ !== "launch") return null;

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string | null) ?? null,
      appId: payload.appId as string,
      appName: payload.appName as string,
      typ: "launch",
    };
  } catch {
    return null;
  }
}

export function buildContextMessage(payload: EmbedContextPayload) {
  return {
    type: EMBED_MESSAGE.CONTEXT,
    version: EMBED_PROTOCOL_VERSION,
    payload,
  };
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { TesterShell } from "@/components/Shell";
import type { SessionUser } from "@/lib/auth";

function getTitle(pathname: string): string {
  if (pathname === "/portal") return "My Test Apps";
  if (pathname === "/portal/issues") return "My Issues";
  if (pathname === "/portal/rewards") return "Rewards";
  return "Testicon";
}

export function PortalLayoutClient({
  session,
  children,
}: {
  session: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isStandalone = pathname.startsWith("/portal/apps/");

  useEffect(() => {
    if (!session && !isStandalone) {
      router.replace("/login");
    }
  }, [session, isStandalone, router]);

  if (isStandalone) return <>{children}</>;
  if (!session) return null;

  return (
    <TesterShell user={session} title={getTitle(pathname)}>
      {children}
    </TesterShell>
  );
}

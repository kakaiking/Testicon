"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/Shell";
import type { SessionUser } from "@/lib/auth";

function getTitle(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/admin/apps") return "Apps";
  if (pathname === "/admin/apps/new") return "Create App";
  if (pathname.startsWith("/admin/apps/")) return "Edit App";
  if (pathname === "/admin/testers") return "Testers & Invitations";
  if (pathname === "/admin/issues") return "Issues";
  if (pathname === "/admin/rewards") return "Rewards & Payouts";
  return "Admin";
}

export function AdminLayoutClient({
  session,
  children,
}: {
  session: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isLogin && (!session || session.role !== "ADMIN")) {
      router.replace("/admin/login");
    }
  }, [isLogin, session, router]);

  if (isLogin) return <>{children}</>;
  if (!session || session.role !== "ADMIN") return null;

  return (
    <AdminShell user={session} title={getTitle(pathname)} pathname={pathname}>
      {children}
    </AdminShell>
  );
}

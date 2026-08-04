"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  Shield,
  Users,
  CircleAlert,
  Wallet,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/apps", label: "Apps", icon: FlaskConical },
  { href: "/admin/testers", label: "Testers", icon: Users },
  { href: "/admin/issues", label: "Issues", icon: CircleAlert },
  { href: "/admin/rewards", label: "Rewards", icon: Wallet },
];

const testerNav = [
  { href: "/portal", label: "My Apps", icon: FlaskConical },
  { href: "/portal/issues", label: "My Issues", icon: CircleAlert },
  { href: "/portal/rewards", label: "Rewards", icon: Wallet },
];

function navIsActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useDrawerLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };

function ShellDrawer({
  open,
  onClose,
  brandHref,
  brandSubtitle,
  nav,
  pathname,
  user,
  portal = false,
}: {
  open: boolean;
  onClose: () => void;
  brandHref: string;
  brandSubtitle?: string;
  nav: NavItem[];
  pathname: string;
  user: SessionUser;
  portal?: boolean;
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="shell-backdrop nav:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`shell-drawer shell-drawer-persistent ${open ? "shell-drawer-open" : ""}`}>
        <div className="p-4 nav:p-6 border-b border-[var(--border-color)] flex items-center justify-between">
          <Link href={brandHref} className="flex items-center gap-2 min-w-0" onClick={onClose}>
            <span className="text-2xl shrink-0">🧪</span>
            <div className="min-w-0">
              <div className="font-heading font-bold text-base nav:text-lg truncate">Testicon</div>
              {brandSubtitle && (
                <div className="text-xs text-[var(--text-muted)] truncate">{brandSubtitle}</div>
              )}
            </div>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            className="nav:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 nav:p-4 space-y-1 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = navIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-[var(--text-main)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 nav:p-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Shield size={16} className="shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <form action="/api/auth/logout" method="POST" className="mt-3">
            <button type="submit" className={`${portal ? "btn-secondary" : "btn-danger"} w-full text-sm py-2`}>
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

export function AdminShell({
  user,
  children,
  title,
  pathname: pathnameProp = "",
}: {
  user: SessionUser;
  children: React.ReactNode;
  title?: string;
  pathname?: string;
}) {
  const pathnameFromHook = usePathname();
  const pathname = pathnameProp || pathnameFromHook;
  const [drawerOpen, setDrawerOpen] = useState(false);

  useDrawerLock(drawerOpen);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col nav:flex-row">
      <ShellDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        brandHref="/admin"
        brandSubtitle="Admin Portal"
        nav={adminNav}
        pathname={pathname}
        user={user}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl px-4 nav:px-8 py-3 nav:py-5 flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="nav:hidden inline-flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-[var(--text-main)] hover:bg-white/5 shrink-0"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h1 className="font-heading text-xl nav:text-2xl font-bold truncate">{title || "Dashboard"}</h1>
        </header>
        <div className="p-4 nav:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}

export function TesterShell({
  user,
  children,
  title,
}: {
  user: SessionUser;
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useDrawerLock(drawerOpen);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col nav:flex-row">
      <ShellDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        brandHref="/portal"
        nav={testerNav}
        pathname={pathname}
        user={user}
        portal
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl px-4 nav:px-8 py-3 nav:py-5 flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="nav:hidden inline-flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-[var(--text-main)] hover:bg-white/5 shrink-0"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h1 className="font-heading text-xl nav:text-2xl font-bold truncate">{title || "My Test Apps"}</h1>
        </header>
        <div className="p-4 nav:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}

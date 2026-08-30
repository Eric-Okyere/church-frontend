"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import RequireAuth from "@/components/RequireAuth";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/scan", label: "Scan / Check-in" },
  { href: "/admin/venue-qr", label: "Venue QR" },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
];

// "/admin" is a prefix of every other admin route, so it needs an exact
// match to avoid lighting up "Dashboard" on every single admin page —
// everything else is active on its own path AND any nested route below it
// (e.g. "/admin/services" stays highlighted while viewing
// "/admin/services/<id>").
function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, active, mobile }: { href: string; label: string; active: boolean; mobile?: boolean }) {
  const base = mobile ? "px-3 py-1.5 rounded-lg whitespace-nowrap" : "px-3 py-2 rounded-lg";
  const state = active
    ? "bg-primary-soft text-primary font-medium"
    : "text-muted hover:text-foreground hover:bg-primary-soft";
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`${base} ${state}`}>
      {label}
    </Link>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");

  function signOut() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-foreground">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-bold">
                G
              </span>
              GraceTrack
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {visibleItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} active={isNavItemActive(pathname, item.href)} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm text-foreground font-medium">{user?.name}</span>
              {user?.churchName && <span className="text-xs text-muted">{user.churchName}</span>}
            </div>
            <button onClick={signOut} className="btn btn-secondary !py-1.5 !px-3 text-xs">
              Sign out
            </button>
          </div>
        </div>
        <nav className="sm:hidden flex items-center gap-1 text-sm px-4 pb-3 overflow-x-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.href === "/scan" ? "Scan" : item.label}
              active={isNavItemActive(pathname, item.href)}
              mobile
            />
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}

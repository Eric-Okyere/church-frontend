"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import RequireAuth from "@/components/RequireAuth";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

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
              <Link href="/admin" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                Dashboard
              </Link>
              <Link href="/admin/services" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                Services
              </Link>
              <Link href="/admin/members" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                Members
              </Link>
              <Link href="/admin/analytics" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                Analytics
              </Link>
              <Link href="/scan" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                Scan / Check-in
              </Link>
              <Link href="/admin/venue-qr" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                Venue QR
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin/settings" className="px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft">
                  Settings
                </Link>
              )}
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
          <Link href="/admin" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
            Dashboard
          </Link>
          <Link href="/admin/services" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
            Services
          </Link>
          <Link href="/admin/members" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
            Members
          </Link>
          <Link href="/admin/analytics" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
            Analytics
          </Link>
          <Link href="/scan" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
            Scan
          </Link>
          <Link href="/admin/venue-qr" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
            Venue QR
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin/settings" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary-soft whitespace-nowrap">
              Settings
            </Link>
          )}
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

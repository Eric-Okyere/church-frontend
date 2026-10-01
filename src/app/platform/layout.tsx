"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

// Deliberately NOT <RequireAuth> — that component only checks "is someone
// signed in" and sends anyone who isn't to /login. This page needs a
// stricter gate: an ordinary church admin IS signed in but must never see
// another church's data here, so they're redirected to their own /admin
// instead of just being let through.
function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/platform");
      return;
    }
    if (!user.isPlatformAdmin) {
      router.replace("/admin");
    }
  }, [loading, user, router]);

  if (loading || !user || !user.isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}

function PlatformShell({ children }: { children: React.ReactNode }) {
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
          <Link href="/platform" className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/linkpii-logo.jpg" alt="Linkpii" width={32} height={32} className="rounded-full object-cover" />
            GraceTrack <span className="text-muted font-normal">— Platform admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-foreground font-medium">{user?.name}</span>
            <button onClick={signOut} className="btn btn-secondary !py-1.5 !px-3 text-xs">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePlatformAdmin>
      <PlatformShell>{children}</PlatformShell>
    </RequirePlatformAdmin>
  );
}

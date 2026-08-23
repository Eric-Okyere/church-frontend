"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await login(String(form.get("username") || ""), String(form.get("password") || ""));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace(searchParams.get("next") || "/admin");
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Username
        </label>
        <input id="username" name="username" type="text" autoComplete="username" required className="input" placeholder="admin" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-bold mb-3">
            G
          </div>
          <h1 className="text-xl font-semibold text-foreground">GraceTrack</h1>
          <p className="text-sm text-muted mt-1">Sign in to manage attendance</p>
        </div>

        <Suspense fallback={<div className="card p-6 h-64" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-muted mt-6">
          First time here? Check the backend README for the default admin login.
        </p>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset your password — try again.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-6 flex flex-col gap-3">
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
          This link is missing its reset token — open the link from your email again, or request a new one.
        </p>
        <Link href="/forgot-password" className="btn btn-secondary w-full text-center">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-6 flex flex-col gap-3">
        <p className="text-sm text-success bg-success-soft rounded-lg px-3 py-2">
          Your password has been reset. You can sign in with it now.
        </p>
        <button onClick={() => router.replace("/login")} className="btn btn-primary w-full">
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="••••••••"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="••••••••"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full mt-2">
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-bold mb-3">
            G
          </div>
          <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>
        </div>

        <Suspense fallback={<div className="card p-6 h-48" />}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-xs text-muted mt-6">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

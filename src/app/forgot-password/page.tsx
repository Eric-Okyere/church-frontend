"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import Image from "next/image";

// Deliberately shows the SAME success message whether or not the email is
// actually on an account — the backend responds identically either way
// (see POST /api/auth/forgot-password) so this page can't be used to probe
// which emails have GraceTrack accounts.
export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    setPending(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the reset email — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/linkpii-logo.jpg" alt="Linkpii" width={48} height={48} className="rounded-full object-cover mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Reset your password</h1>
          <p className="text-sm text-muted mt-1 text-center">
            Enter the email on your account and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="card p-6 flex flex-col gap-3">
            <p className="text-sm text-success bg-success-soft rounded-lg px-3 py-2">
              If that email is on an account, we&apos;ve sent a reset link. Check your inbox (and spam folder).
            </p>
            <Link href="/login" className="btn btn-secondary w-full text-center">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
            {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted">
                No email on file yet? An admin can add one from Settings once signed in — until then, ask whoever set
                up your church&apos;s account to add it for you.
              </p>
            </div>
            <button type="submit" disabled={pending} className="btn btn-primary w-full mt-2">
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted mt-6">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

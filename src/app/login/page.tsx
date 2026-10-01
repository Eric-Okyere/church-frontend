"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-context";
import Image from "next/image";

const RESEND_COOLDOWN_MS = 30_000;

function LoginForm() {
  const { login, verifySignupCode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Set only when login fails because the account hasn't verified its
  // email yet (see routes/auth.js) — lets the person finish verifying
  // right here instead of hitting a dead-end error with no way forward.
  const [needsVerification, setNeedsVerification] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [resendRemainingMs, setResendRemainingMs] = useState(0);

  useEffect(() => {
    if (!needsVerification || !lastSentAt) {
      setResendRemainingMs(0);
      return;
    }
    const update = () => setResendRemainingMs(Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - lastSentAt)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [needsVerification, lastSentAt]);

  function goToDestination(user: AuthUser) {
    // A platform admin isn't scoped to any church, so /admin (which
    // assumes one) isn't where they belong — send them to the master
    // dashboard instead, ignoring any `next` param a church-admin link
    // might have set.
    if (user.isPlatformAdmin) {
      router.replace("/platform");
      return;
    }
    router.replace(searchParams.get("next") || "/admin");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNeedsVerification(null);
    const form = new FormData(e.currentTarget);
    const result = await login(String(form.get("username") || ""), String(form.get("password") || ""));
    setPending(false);
    if (result.status === "verification-required") {
      setNeedsVerification(result.email);
      setLastSentAt(Date.now()); // they already have a code from signup — only a fresh "Resend" sends another
      return;
    }
    if (result.status === "error") {
      setError(result.error);
      return;
    }
    goToDestination(result.user);
  }

  async function resendCode() {
    if (!needsVerification) return;
    setSendError(null);
    setSendPending(true);
    try {
      await api.post("/api/churches/send-signup-code", { email: needsVerification });
      setLastSentAt(Date.now());
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Couldn't resend a code — try again.");
    } finally {
      setSendPending(false);
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!needsVerification) return;
    setVerifyError(null);
    if (!code.trim()) {
      setVerifyError("Enter the 6-digit code we emailed you.");
      return;
    }
    setVerifyPending(true);
    const result = await verifySignupCode(needsVerification, code.trim());
    setVerifyPending(false);
    if (result.error) {
      setVerifyError(result.error);
      return;
    }
    if (result.user) goToDestination(result.user);
  }

  if (needsVerification) {
    return (
      <form onSubmit={onVerifyCode} className="card p-6 flex flex-col gap-4">
        <div className="text-sm bg-primary-soft/40 text-foreground rounded-lg px-3 py-2">
          Verify <span className="font-medium">{needsVerification}</span> to finish signing in — enter the code we
          emailed you.
        </div>
        {verifyError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{verifyError}</div>}
        {sendError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{sendError}</div>}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="loginCode" className="text-sm font-medium text-foreground">
            6-digit code
          </label>
          <input
            id="loginCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="input text-center text-lg tracking-[0.4em]"
            placeholder="123456"
          />
        </div>
        <button type="submit" disabled={verifyPending} className="btn btn-primary w-full">
          {verifyPending ? "Verifying…" : "Verify & sign in"}
        </button>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setNeedsVerification(null);
              setCode("");
              setVerifyError(null);
            }}
            className="text-muted hover:text-foreground hover:underline"
          >
            Back to sign in
          </button>
          <button
            type="button"
            onClick={resendCode}
            disabled={resendRemainingMs > 0 || sendPending}
            className="text-primary font-medium hover:underline disabled:text-muted disabled:no-underline disabled:cursor-not-allowed"
          >
            {resendRemainingMs > 0 ? `Resend code (${Math.ceil(resendRemainingMs / 1000)}s)` : "Resend code"}
          </button>
        </div>
      </form>
    );
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
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
            Forgot password?
          </Link>
        </div>
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
          <Image src="/linkpii-logo.jpg" alt="Linkpii" width={48} height={48} className="rounded-full object-cover mb-3" />
          <h1 className="text-xl font-semibold text-foreground">GraceTrack</h1>
          <p className="text-sm text-muted mt-1">Sign in to manage attendance</p>
        </div>

        <Suspense fallback={<div className="card p-6 h-64" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-muted mt-6">
          New church?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Create your church&apos;s account
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

type Step = "form" | "code";

const RESEND_COOLDOWN_MS = 30_000;

export default function SignupPage() {
  const { signup, verifySignupCode } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");

  // Step 1 — the full signup form, all fields at once (church name, admin
  // name, username, email, phone, password, GPS). Submitting it creates
  // the account right away — but unverified, so it can't sign in yet (see
  // routes/churches.js and routes/auth.js's /login).
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 — confirm the 6-digit code that was auto-sent when the account
  // was created. Success signs the account straight in (no need to
  // separately retype the username/password on /login).
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);

  const [sendError, setSendError] = useState<string | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  // Ticks down once a second while on the code step, so the resend button
  // actually counts down. Computed into state (not read from Date.now()
  // directly during render) so render stays a pure function of props/state.
  const [resendRemainingMs, setResendRemainingMs] = useState(0);

  useEffect(() => {
    if (step !== "code" || !lastSentAt) {
      setResendRemainingMs(0);
      return;
    }
    const update = () => setResendRemainingMs(Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - lastSentAt)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [step, lastSentAt]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocateError("This browser doesn't support location — enter coordinates manually below.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location — allow location access, or enter coordinates manually below.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

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
    const emailValue = String(form.get("email") || "").trim().toLowerCase();

    setPending(true);
    const result = await signup({
      churchName: String(form.get("churchName") || ""),
      adminName: String(form.get("adminName") || ""),
      username: String(form.get("username") || ""),
      email: emailValue,
      phone: String(form.get("phone") || ""),
      password,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      radiusMeters: 200,
    });
    setPending(false);
    if (result.status === "error") {
      setError(result.error);
      return;
    }

    setEmail(result.email);
    setLastSentAt(Date.now()); // the backend just auto-sent the first code
    setVerifyError(result.emailSendFailed ? "We had trouble sending that email — tap Resend to try again." : null);
    setStep("code");
  }

  async function resendCode() {
    setSendError(null);
    setSendPending(true);
    try {
      await api.post("/api/churches/send-signup-code", { email });
      setLastSentAt(Date.now());
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Couldn't resend a code — try again.");
    } finally {
      setSendPending(false);
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    if (!code.trim()) {
      setVerifyError("Enter the 6-digit code we emailed you.");
      return;
    }
    setVerifyPending(true);
    const result = await verifySignupCode(email, code.trim());
    setVerifyPending(false);
    if (result.error) {
      setVerifyError(result.error);
      return;
    }
    router.replace("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-bold mb-3">
            G
          </div>
          <h1 className="text-xl font-semibold text-foreground">Create your church&apos;s account</h1>
          <p className="text-sm text-muted mt-1 text-center">
            Set up GraceTrack for your congregation — your members and attendance stay private to your church.
          </p>
        </div>

        {step === "form" && (
          <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
            {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="churchName" className="text-sm font-medium text-foreground">
                Church name
              </label>
              <input id="churchName" name="churchName" required className="input" placeholder="Grace Chapel" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adminName" className="text-sm font-medium text-foreground">
                Your name
              </label>
              <input id="adminName" name="adminName" required className="input" placeholder="Ama Mensah" />
              <p className="text-xs text-muted">You&apos;ll be this church&apos;s first admin — you can add more ushers/admins later.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <input
                id="username"
                name="username"
                required
                minLength={3}
                autoComplete="username"
                className="input"
                placeholder="ama_admin"
              />
              <p className="text-xs text-muted">Usernames are shared across every church on GraceTrack, so pick something distinctive.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted">
                We&apos;ll email a 6-digit code to confirm it&apos;s really yours before you can sign in — it&apos;s also
                how you&apos;ll reset your password if you ever forget it.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone number <span className="text-muted font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="input"
                placeholder="024 123 4567"
              />
              <p className="text-xs text-muted">So we can reach your church directly if we ever need to — e.g. about your account.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="input pr-14"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="input pr-14"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Your church&apos;s location (optional)</p>
              <p className="text-xs text-muted">
                Needed only for members to self-check-in by scanning a poster QR code — it confirms they&apos;re actually on
                the premises. You can skip this now and set it later from Settings.
              </p>
              <button type="button" onClick={useMyLocation} disabled={locating} className="btn btn-secondary self-start">
                {locating ? "Getting your location…" : "Use my current location"}
              </button>
              {locateError && <p className="text-xs text-danger">{locateError}</p>}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="latitude" className="text-xs font-medium text-foreground">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="input"
                    placeholder="5.6037"
                    inputMode="decimal"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="longitude" className="text-xs font-medium text-foreground">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="input"
                    placeholder="-0.1870"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={pending} className="btn btn-primary w-full mt-2">
              {pending ? "Creating your account…" : "Create church account"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={onVerifyCode} className="card p-6 flex flex-col gap-4">
            <div className="text-sm bg-success-soft text-foreground rounded-lg px-3 py-2">
              Your account was created. Enter the code we sent to <span className="font-medium">{email}</span> to
              finish signing in.
            </div>
            {verifyError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{verifyError}</div>}
            {sendError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{sendError}</div>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className="text-sm font-medium text-foreground">
                6-digit code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input text-center text-lg tracking-[0.4em]"
                placeholder="123456"
              />
              <p className="text-xs text-muted">The code expires in 10 minutes.</p>
            </div>
            <button type="submit" disabled={verifyPending} className="btn btn-primary w-full">
              {verifyPending ? "Verifying…" : "Verify & sign in"}
            </button>
            <div className="flex items-center justify-center text-xs">
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
        )}

        <p className="text-center text-xs text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

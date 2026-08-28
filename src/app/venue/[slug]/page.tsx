"use client";

import { use, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type ChildOption = { id: string; name: string };

type VerifyResult =
  | { ok: true; venueToken: string; member: { id: string; name: string }; children: ChildOption[] }
  | { ok: false; reason: string };

type CheckInResult =
  | { ok: true; alreadyIn: boolean; memberName: string; serviceName: string }
  | { ok: false; reason: string };

type Step =
  | "loading-church"
  | "unknown-church"
  | "locating"
  | "location-error"
  | "phone"
  | "verifying"
  | "session"
  | "result";

// Maps a backend `reason` code to a message a member (not a developer) can
// act on. Keep these specific — "something went wrong" isn't actionable
// when the real reason is "you're not close enough to the building".
const REASON_MESSAGES: Record<string, string> = {
  out_of_range: "You appear to be outside the premises. Please check in with an usher instead.",
  invalid_location: "We couldn't read your device's location. Please try again.",
  not_configured: "Location check-in isn't set up yet — please see an usher.",
  no_active_service: "No service is active right now. Please check in with an usher instead.",
  not_found: "We couldn't find that phone number on file. Double-check it and try again, or see an usher.",
  invalid_member: "We couldn't find that record — please try again.",
  inactive_member: "This record is inactive. Please see an usher for help.",
  rate_limited: "Too many attempts — please wait a few minutes and try again, or see an usher.",
  invalid_request: "Something was missing from that request. Please try again.",
  unknown_church: "We don't recognize this check-in link. Please ask your church for their current QR code or link.",
  session_expired: "Your session timed out — please verify again.",
  not_your_child: "That child isn't linked to your record — please see an usher.",
};

export default function VenueCheckInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [step, setStep] = useState<Step>("loading-church");
  const [churchName, setChurchName] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [phone, setPhone] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Set once verify succeeds — everything in the "session" step is scoped
  // to this token, which the backend ties to exactly one member.
  const [session, setSession] = useState<{ venueToken: string; memberName: string; children: ChildOption[] } | null>(
    null
  );
  const [actionResult, setActionResult] = useState<{ label: string; result: CheckInResult } | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null); // "self" | childId | null

  const [result, setResult] = useState<CheckInResult | null>(null);

  // First, confirm this link points at a real, active church — a bad or
  // mistyped slug should say so clearly rather than silently behaving like
  // an empty form.
  useEffect(() => {
    api
      .get<{ church: { name: string; slug: string } }>(`/api/churches/${encodeURIComponent(slug)}`)
      .then((res) => {
        setChurchName(res.church.name);
        setStep("locating");
      })
      .catch(() => setStep("unknown-church"));
  }, [slug]);

  // Request location once the church is confirmed — nothing else on this
  // page can proceed without it, so there's no point asking later.
  useEffect(() => {
    if (step !== "locating") return;
    if (!("geolocation" in navigator)) {
      setLocationError("This browser doesn't support location. Please check in with an usher instead.");
      setStep("location-error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStep("phone");
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied. Please allow location for this site and reload, or check in with an usher instead."
            : "We couldn't get your location. Please try again, or check in with an usher instead.";
        setLocationError(message);
        setStep("location-error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [step]);

  function retryLocation() {
    setStep("locating");
    setLocationError(null);
  }

  // The whole identity check is just this: phone number + being on-site.
  // No name search, no picking yourself out of a list — the backend looks
  // the member up by phone directly, scoped to this one church.
  async function submitVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!coordsRef.current) return;
    setVerifyError(null);
    setStep("verifying");
    try {
      const data = await api.post<VerifyResult>("/api/attendance/venue-verify", {
        slug,
        phone,
        lat: coordsRef.current.lat,
        lng: coordsRef.current.lng,
      });
      if (!data.ok) {
        if (data.reason === "not_found") {
          setVerifyError(REASON_MESSAGES.not_found);
          setStep("phone");
          return;
        }
        setResult(data);
        setStep("result");
        return;
      }
      setSession({ venueToken: data.venueToken, memberName: data.member.name, children: data.children });
      setActionResult(null);
      setStep("session");
    } catch {
      setResult({ ok: false, reason: "invalid_request" });
      setStep("result");
    }
  }

  async function checkInSelf() {
    if (!session) return;
    setActingOn("self");
    try {
      const data = await api.post<CheckInResult>("/api/attendance/venue-checkin-self", {
        venueToken: session.venueToken,
        lat: coordsRef.current?.lat,
        lng: coordsRef.current?.lng,
      });
      setActionResult({ label: session.memberName, result: data });
    } catch {
      setActionResult({ label: session.memberName, result: { ok: false, reason: "invalid_request" } });
    } finally {
      setActingOn(null);
    }
  }

  async function checkInChild(child: ChildOption) {
    if (!session) return;
    setActingOn(child.id);
    try {
      const data = await api.post<CheckInResult>("/api/attendance/venue-checkin-child", {
        venueToken: session.venueToken,
        childId: child.id,
        lat: coordsRef.current?.lat,
        lng: coordsRef.current?.lng,
      });
      setActionResult({ label: child.name, result: data });
    } catch {
      setActionResult({ label: child.name, result: { ok: false, reason: "invalid_request" } });
    } finally {
      setActingOn(null);
    }
  }

  function startOver() {
    setPhone("");
    setVerifyError(null);
    setResult(null);
    setSession(null);
    setActionResult(null);
    setStep("phone");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="card p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-lg font-bold mx-auto mb-3">
            G
          </span>
          <h1 className="text-xl font-semibold text-foreground">Welcome{churchName ? ` to ${churchName}` : ""}!</h1>
          <p className="text-muted text-sm mt-1">
            We&apos;re glad you&apos;re here. Just enter your phone number below to check yourself in — and your
            children too, if they&apos;re with you today.
          </p>
        </div>

        {step === "loading-church" && <p className="text-sm text-muted text-center py-6">Loading…</p>}

        {step === "unknown-church" && (
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
            {REASON_MESSAGES.unknown_church}
          </p>
        )}

        {step === "locating" && <p className="text-sm text-muted text-center py-6">Checking your location…</p>}

        {step === "location-error" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{locationError}</p>
            <button onClick={retryLocation} className="btn btn-primary">
              Try again
            </button>
          </div>
        )}

        {(step === "phone" || step === "verifying") && (
          <form onSubmit={submitVerify} className="flex flex-col gap-3">
            {verifyError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{verifyError}</div>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Your phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="024 000 0000"
              />
              <p className="text-xs text-muted">Enter the phone number on file with the church.</p>
            </div>
            <button type="submit" disabled={step === "verifying"} className="btn btn-primary">
              {step === "verifying" ? "Checking…" : "Continue"}
            </button>
          </form>
        )}

        {step === "session" && session && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Verified as <span className="font-semibold text-foreground">{session.memberName}</span>. Check
              yourself in, or check in one of your children below.
            </p>

            {actionResult && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  actionResult.result.ok ? "text-success bg-success-soft" : "text-danger bg-danger-soft"
                }`}
              >
                {actionResult.result.ok
                  ? `${actionResult.label}: ${actionResult.result.alreadyIn ? "already checked in" : "checked in!"}`
                  : `${actionResult.label}: ${REASON_MESSAGES[actionResult.result.reason] || "Couldn't check in — please see an usher."}`}
              </div>
            )}

            <button onClick={checkInSelf} disabled={actingOn !== null} className="btn btn-primary">
              {actingOn === "self" ? "Checking in…" : `Check myself in (${session.memberName.split(" ")[0]})`}
            </button>

            {session.children.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Your children</p>
                {session.children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => checkInChild(c)}
                    disabled={actingOn !== null}
                    className="btn btn-secondary"
                  >
                    {actingOn === c.id ? "Checking in…" : `Check in ${c.name}`}
                  </button>
                ))}
              </div>
            )}

            <button onClick={startOver} className="text-xs text-muted hover:text-foreground mt-2">
              Done — start over
            </button>
          </div>
        )}

        {step === "result" && result && (
          <div className="text-center">
            {result.ok ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                  style={{ background: "var(--success-soft)", color: "var(--success)" }}
                >
                  ✓
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {result.alreadyIn ? "Already checked in" : "You're checked in!"}
                </h2>
                <p className="text-muted text-sm mt-2">
                  {result.memberName} · {result.serviceName}
                </p>
              </>
            ) : (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                  style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                >
                  !
                </div>
                <h2 className="text-lg font-semibold text-foreground">Couldn&apos;t check you in</h2>
                <p className="text-muted text-sm mt-2">{REASON_MESSAGES[result.reason] || "Please see an usher for help."}</p>
                <button onClick={startOver} className="btn btn-secondary mt-4">
                  Try again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

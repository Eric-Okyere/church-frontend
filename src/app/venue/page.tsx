"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

type LookupMember = { id: string; name: string };

type CheckInResult =
  | { ok: true; alreadyIn: boolean; memberName: string; serviceName: string }
  | { ok: false; reason: string };

type Step = "locating" | "location-error" | "search" | "confirm" | "submitting" | "result";

// Maps a backend `reason` code to a message a member (not a developer) can
// act on. Keep these specific — "something went wrong" isn't actionable
// when the real reason is "you're not close enough to the building".
const REASON_MESSAGES: Record<string, string> = {
  out_of_range: "You appear to be outside the church premises. Please check in with an usher instead.",
  invalid_location: "We couldn't read your device's location. Please try again.",
  not_configured: "Location check-in isn't set up yet — please see an usher.",
  no_active_service: "No service is active right now. Please check in with an usher instead.",
  invalid_member: "We couldn't find that member — please try searching again.",
  inactive_member: "This membership is inactive. Please see an usher for help.",
  identity_mismatch: "That phone number doesn't match our records. Double-check it and try again.",
  rate_limited: "Too many attempts — please wait a few minutes and try again, or see an usher.",
  invalid_request: "Something was missing from that request. Please try again.",
};

export default function VenueCheckInPage() {
  const [step, setStep] = useState<Step>("locating");
  const [locationError, setLocationError] = useState<string | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupMember[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<LookupMember | null>(null);
  const [phone, setPhone] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [result, setResult] = useState<CheckInResult | null>(null);

  // Request location once, up front — nothing else on this page can proceed
  // without it, so there's no point asking later.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("This browser doesn't support location. Please check in with an usher instead.");
      setStep("location-error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStep("search");
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
  }, []);

  function retryLocation() {
    setStep("locating");
    setLocationError(null);
  }

  // Debounced search-as-you-type.
  useEffect(() => {
    if (step !== "search") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const data = await api.get<{ members: LookupMember[] }>(`/api/members/lookup?q=${encodeURIComponent(q)}`);
        setResults(data.members);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, step]);

  function pickMember(member: LookupMember) {
    setSelected(member);
    setPhone("");
    setConfirmError(null);
    setStep("confirm");
  }

  function backToSearch() {
    setSelected(null);
    setStep("search");
  }

  async function submitCheckIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !coordsRef.current) return;
    setConfirmError(null);
    setStep("submitting");
    try {
      const data = await api.post<CheckInResult>("/api/attendance/venue-checkin", {
        memberId: selected.id,
        phone,
        lat: coordsRef.current.lat,
        lng: coordsRef.current.lng,
      });
      if (!data.ok) {
        // Identity mismatch and a couple of others are worth letting the
        // member fix without losing their place (re-typing a phone number
        // shouldn't mean searching their name again).
        if (data.reason === "identity_mismatch") {
          setConfirmError(REASON_MESSAGES.identity_mismatch);
          setStep("confirm");
          return;
        }
        setResult(data);
        setStep("result");
        return;
      }
      setResult(data);
      setStep("result");
    } catch (err) {
      setResult({ ok: false, reason: err instanceof ApiError ? "invalid_request" : "invalid_request" });
      setStep("result");
    }
  }

  function startOver() {
    setSelected(null);
    setPhone("");
    setResult(null);
    setQuery("");
    setResults([]);
    setStep("search");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="card p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <span className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-lg font-bold mx-auto mb-3">
            G
          </span>
          <h1 className="text-xl font-semibold text-foreground">Check in</h1>
          <p className="text-muted text-sm mt-1">Find your name to mark yourself present.</p>
        </div>

        {step === "locating" && (
          <p className="text-sm text-muted text-center py-6">Checking your location…</p>
        )}

        {step === "location-error" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{locationError}</p>
            <button onClick={retryLocation} className="btn btn-primary">
              Try again
            </button>
          </div>
        )}

        {step === "search" && (
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input"
              placeholder="Type your name"
            />
            {searching && <p className="text-xs text-muted">Searching…</p>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-xs text-muted">No matches — check the spelling, or see an usher.</p>
            )}
            <div className="flex flex-col divide-y divide-border">
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMember(m)}
                  className="text-left py-3 text-sm font-medium text-foreground hover:text-primary"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {(step === "confirm" || step === "submitting") && selected && (
          <form onSubmit={submitCheckIn} className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              Confirming: <span className="font-semibold">{selected.name}</span>
            </p>
            {confirmError && (
              <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{confirmError}</div>
            )}
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
              <p className="text-xs text-muted">Enter the phone number on file with the church — this confirms it&apos;s you.</p>
            </div>
            <button type="submit" disabled={step === "submitting"} className="btn btn-primary">
              {step === "submitting" ? "Checking in…" : "Check in"}
            </button>
            <button type="button" onClick={backToSearch} className="text-xs text-muted hover:text-foreground">
              Not you? Search again
            </button>
          </form>
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
                <p className="text-muted text-sm mt-2">{result.memberName} · {result.serviceName}</p>
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

"use client";

import { use, useEffect, useState } from "react";
import { API_URL, getToken } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { getCurrentPosition } from "@/lib/geolocation";

type CheckInResult =
  | { ok: true; alreadyIn: boolean; memberName: string; serviceName: string }
  | {
      ok: false;
      reason: "no_active_service" | "invalid_token" | "inactive_member" | "unauthorized" | "location_required" | "out_of_range";
    };

// A member's/child's personal QR code encodes a plain link to this page —
// which means any phone's camera app can open it, not just the in-app
// kiosk scanner. The backend now requires an admin/usher session to
// actually check someone in this way (see the "admin-only-qr-checkin"
// note in church-backend), so this page only succeeds when it's opened
// from a browser where an admin/usher is already signed in — attaching
// the stored token below is what makes that possible, and every other
// visitor (the overwhelmingly common case) gets the "unauthorized" state.
export default function SelfCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<CheckInResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const authToken = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    // The admin's own device location — required (once the church has GPS
    // configured) by the same on-premises check every other admin check-in
    // path uses. A signed-out visitor never gets far enough to need this
    // (they're already stopped by the 401/"unauthorized" branch below).
    getCurrentPosition().then((location) => {
      if (cancelled) return;
      const coords = location.ok ? { lat: location.lat, lng: location.lng } : {};

      fetch(`${API_URL}/api/attendance/checkin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ token, ...coords }),
      })
        .then(async (res) => {
          if (res.status === 401) return { ok: false, reason: "unauthorized" } as const;
          if (res.status === 403) return res.json().catch(() => ({ ok: false, reason: "location_required" }));
          return res.json();
        })
        .then((data) => {
          if (!cancelled) setResult(data);
        })
        .catch(() => {
          if (!cancelled) setResult({ ok: false, reason: "invalid_token" });
        });
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const now = formatTime(new Date().toISOString());

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="card p-8 max-w-sm w-full text-center">
        {!result && <p className="text-sm text-muted">Checking you in…</p>}

        {result?.ok && (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: "var(--success-soft)", color: "var(--success)" }}
            >
              ✓
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {result.alreadyIn ? "Already checked in" : "You're checked in!"}
            </h1>
            <p className="text-muted text-sm mt-2">
              {result.memberName} · {result.serviceName}
            </p>
            <p className="text-xs text-muted mt-1">{now}</p>
          </>
        )}

        {result && !result.ok && (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
            >
              !
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {result.reason === "no_active_service" && "No service is active right now"}
              {result.reason === "invalid_token" && "QR code not recognized"}
              {result.reason === "inactive_member" && "This membership is inactive"}
              {result.reason === "unauthorized" && "This check-in needs an usher"}
              {(result.reason === "location_required" || result.reason === "out_of_range") && "Can't check in from here"}
            </h1>
            <p className="text-muted text-sm mt-2">
              {result.reason === "no_active_service" && "Please check in with an usher at the entrance instead."}
              {result.reason === "unauthorized" &&
                "Personal QR codes are checked in by church staff, not by scanning with your own camera. Please see an usher at the entrance — they'll scan you in."}
              {(result.reason === "invalid_token" || result.reason === "inactive_member") &&
                "Please see an usher at the entrance for help."}
              {result.reason === "location_required" &&
                "This device's location couldn't be verified. Enable location access and try again."}
              {result.reason === "out_of_range" && "This device doesn't appear to be at the church right now."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

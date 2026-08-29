import { useCallback, useEffect, useRef, useState } from "react";

// Shared by every admin/usher screen that records someone's attendance
// (the kiosk scanner, manual check-in, the personal-QR link) — each one
// needs the ADMIN's own device location to prove they're at the church,
// same idea as the existing venue self-check-in page's own geolocation
// call, just reused for staff instead of members.
export type GeoResult = { ok: true; lat: number; lng: number } | { ok: false; reason: "unsupported" | "denied" | "unavailable" };

export function getCurrentPosition(timeoutMs = 15000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

// A friendly message for a client-side geolocation failure (couldn't even
// get a location to send) — distinct from the server's own reasons
// ("location_required" when the server got no coordinates at all,
// "out_of_range" when it got them but they're too far from the church).
export function geoErrorMessage(reason: "unsupported" | "denied" | "unavailable"): string {
  if (reason === "unsupported") return "This device/browser doesn't support location. Please use a different device to check members in.";
  if (reason === "denied") return "Location access was denied. Please allow location for this site, then try again.";
  return "Couldn't get your location. Please try again.";
}

// A friendly message for the 403 the backend sends when the admin's
// location doesn't clear the church's premises radius (or wasn't sent at
// all despite the church having GPS configured).
export function premisesErrorMessage(reason?: string): string {
  if (reason === "out_of_range") return "You must be at the church to check members in — you appear to be too far away.";
  if (reason === "location_required") return "Enable location access to check members in.";
  return "Couldn't check them in — please try again.";
}

// Pulls the `reason` code out of an ApiError thrown by a 403 on-premises
// rejection (`{ ok: false, reason: "out_of_range" | "location_required" }`)
// so callers can pass it straight to `premisesErrorMessage`.
export function reasonFromError(err: unknown): string | undefined {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object" && "reason" in data) {
      return (data as { reason?: string }).reason;
    }
  }
  return undefined;
}

// Fetches (and lets the caller retry) the admin's own device location once
// on mount, for screens like manual check-in that make several requests in
// a row rather than one — same "one fix per admin session at the kiosk" idea
// as the QR scanner, just shared as a hook so it isn't duplicated per screen.
export function useAdminLocation() {
  const [error, setError] = useState<string | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [ready, setReady] = useState(false);

  const fetchLocation = useCallback(async () => {
    setError(null);
    const location = await getCurrentPosition();
    if (!location.ok) {
      setError(geoErrorMessage(location.reason));
      coordsRef.current = null;
      setReady(false);
      return;
    }
    coordsRef.current = { lat: location.lat, lng: location.lng };
    setReady(true);
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { coordsRef, locationError: error, retryLocation: fetchLocation, locationReady: ready };
}

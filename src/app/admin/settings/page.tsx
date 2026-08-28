"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type ChurchSettings = {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
};

export default function SettingsPage() {
  const [church, setChurch] = useState<ChurchSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ church: ChurchSettings }>("/api/church/settings")
      .then((res) => {
        setChurch(res.church);
        setLatitude(res.church.latitude !== null ? String(res.church.latitude) : "");
        setLongitude(res.church.longitude !== null ? String(res.church.longitude) : "");
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load your church's settings."));
  }, []);

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
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await api.patch<{ church: ChurchSettings }>("/api/church/settings", {
        name: String(form.get("name") || ""),
        latitude: latitude === "" ? null : Number(latitude),
        longitude: longitude === "" ? null : Number(longitude),
        radiusMeters: Number(form.get("radiusMeters") || 200),
      });
      setChurch(res.church);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save — try again.");
    } finally {
      setPending(false);
    }
  }

  if (loadError) return <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 max-w-lg">{loadError}</p>;
  if (!church) return <p className="text-sm text-muted">Loading…</p>;

  const venueUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/venue/${church.slug}`;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Church settings</h1>
        <p className="text-muted text-sm mt-1">
          Your check-in link and self-check-in coverage area — only your own members and ushers ever see this.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-1">Your self-check-in link</h2>
        <p className="text-xs text-muted mb-3">
          The poster QR code (Venue QR page) encodes this link — it&apos;s unique to your church, so scanning it only ever
          searches your own members.
        </p>
        <p className="text-sm font-mono bg-primary-soft/40 rounded-lg px-3 py-2 break-all">{venueUrl}</p>
      </div>

      <form onSubmit={onSubmit} className="card p-6 flex flex-col gap-4">
        {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}
        {success && <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2">Saved.</div>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Church name
          </label>
          <input id="name" name="name" required defaultValue={church.name} className="input" />
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Coverage area (for member self-check-in)</p>
          <p className="text-xs text-muted">
            A member&apos;s phone must be within the radius below of these coordinates for the venue self-check-in QR
            code to work. Leave coordinates blank to disable self-check-in until you set this.
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
          <div className="flex flex-col gap-1.5 mt-1">
            <label htmlFor="radiusMeters" className="text-sm font-medium text-foreground">
              Check-in radius (meters)
            </label>
            <input
              id="radiusMeters"
              name="radiusMeters"
              type="number"
              min="1"
              defaultValue={church.radiusMeters}
              className="input max-w-[10rem]"
            />
            <p className="text-xs text-muted">200 is a reasonable default — covers the building and parking lot with GPS drift room.</p>
          </div>
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary self-start">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

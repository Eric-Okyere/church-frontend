"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

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

    setPending(true);
    const result = await signup({
      churchName: String(form.get("churchName") || ""),
      adminName: String(form.get("adminName") || ""),
      username: String(form.get("username") || ""),
      password,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      radiusMeters: 200,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
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
                Confirm
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

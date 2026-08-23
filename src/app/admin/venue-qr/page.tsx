"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type VenueQr = { dataUrl: string; checkInUrl: string };

export default function VenueQrPage() {
  const [data, setData] = useState<VenueQr | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<VenueQr>("/api/venue-qrcode")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the QR code."));
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Venue QR code</h1>
        <p className="text-muted text-sm mt-1">
          Print this and post it at the entrance. Any member can scan it with their own phone camera to check
          themselves in — no usher needed. It always checks people into whichever service is currently active.
        </p>
      </div>

      {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

      {data && (
        <div className="card p-8 flex flex-col items-center text-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.dataUrl} alt="Venue check-in QR code" className="w-64 h-64 rounded-xl border border-border" />
          <a href={data.dataUrl} download="venue_checkin_qr.png" className="btn btn-secondary">
            Download to print
          </a>
          <p className="text-xs text-muted break-all">{data.checkInUrl}</p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-2">Before printing</h2>
        <p className="text-sm text-muted">
          Members checking in this way need a browser location prompt to succeed — they must allow location access
          when asked, and their phone GPS needs to place them near the building. This is a permanent code: it never
          expires or changes, so print and laminate it once. It only works while a service is active and never
          replaces manual/usher check-in as a fallback.
        </p>
      </div>
    </div>
  );
}

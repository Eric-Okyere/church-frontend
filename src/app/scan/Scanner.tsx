"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type ScanResult = {
  ok: boolean;
  alreadyIn?: boolean;
  memberName?: string;
  serviceName?: string;
  reason?: string;
};

const SCANNER_ID = "qr-reader";

export default function Scanner() {
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<{ id: string; text: string; tone: "success" | "warning" | "muted" }[]>([]);
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);

  useEffect(() => {
    return () => {
      // Stop the camera stream and let the library remove its own <video>
      // element before this component's own DOM tree gets torn down.
      scannerRef.current
        ?.stop()
        .catch(() => {})
        .finally(() => scannerRef.current?.clear());
    };
  }, []);

  function pushFeed(text: string, tone: "success" | "warning" | "muted") {
    const id = crypto.randomUUID();
    setFeed((f) => [{ id, text, tone }, ...f].slice(0, 8));
  }

  async function handleDecoded(rawText: string) {
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.token === rawText && now - lastScanRef.current.at < 4000) {
      return;
    }
    lastScanRef.current = { token: rawText, at: now };

    try {
      const data = await api.post<ScanResult>("/api/attendance/scan", { token: rawText });

      if (data.ok && !data.alreadyIn) {
        pushFeed(`${data.memberName} checked in`, "success");
      } else if (data.ok && data.alreadyIn) {
        pushFeed(`${data.memberName} already checked in`, "warning");
      } else if (data.reason === "no_active_service") {
        pushFeed("No active service — start one first", "warning");
      } else {
        pushFeed("Code not recognized", "warning");
      }
    } catch {
      pushFeed("Network error — try again", "warning");
    }
  }

  async function start() {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleDecoded(decodedText),
        () => {
          /* ignore per-frame decode errors */
        }
      );
      setRunning(true);
    } catch {
      setError("Couldn't access the camera. Check permissions, or use manual check-in instead.");
    }
  }

  async function stop() {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {
      /* noop */
    }
    setRunning(false);
  }

  const toneClass = {
    success: "badge-success",
    warning: "badge-warning",
    muted: "badge-muted",
  } as const;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Scan a member&apos;s QR code</h2>
        {!running ? (
          <button onClick={start} className="btn btn-primary">
            Start camera
          </button>
        ) : (
          <button onClick={stop} className="btn btn-secondary">
            Stop
          </button>
        )}
      </div>

      {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-3">{error}</p>}

      <div
        className="relative rounded-xl overflow-hidden bg-black/5 border border-border"
        style={{ minHeight: running ? undefined : 220 }}
      >
        {/* html5-qrcode injects a <video> here directly via the DOM, outside
            React's control. This div must never have React-rendered children —
            otherwise React's reconciler and the library fight over the same
            nodes and crash with "Failed to execute 'removeChild'". */}
        <div id={SCANNER_ID} className="w-full" />
        {!running && (
          <div className="absolute inset-0 h-56 flex items-center justify-center text-sm text-muted px-6 text-center pointer-events-none">
            Point a phone or tablet camera here at each member&apos;s personal QR code to check them in instantly.
          </div>
        )}
      </div>

      {feed.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {feed.map((f) => (
            <div key={f.id} className={`badge ${toneClass[f.tone]} justify-start`}>
              {f.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Child = { id: string; name: string; active: boolean };

function ChildRow({ child, onChanged }: { child: Child; onChanged: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleQr() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!qrDataUrl) {
      const res = await api.get<{ dataUrl: string }>(`/api/children/${child.id}/qrcode`);
      setQrDataUrl(res.dataUrl);
    }
    setExpanded(true);
  }

  async function toggleActive() {
    setBusy(true);
    try {
      await api.post(`/api/children/${child.id}/${child.active ? "deactivate" : "reactivate"}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{child.name}</p>
          {!child.active && <span className="badge badge-muted">Inactive</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleQr} className="text-xs font-semibold text-primary hover:underline">
            {expanded ? "Hide QR" : "View QR"}
          </button>
          <button disabled={busy} onClick={toggleActive} className="text-xs text-muted hover:text-foreground">
            {child.active ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </div>
      {expanded && qrDataUrl && (
        <div className="flex flex-col items-center gap-2 mt-3 p-4 rounded-xl bg-primary-soft/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code for ${child.name}`} className="w-40 h-40 rounded-lg border border-border" />
          <a href={qrDataUrl} download={`${child.name.replace(/\s+/g, "_")}_qr.png`} className="btn btn-secondary !py-1.5 !px-3 text-xs">
            Download
          </a>
        </div>
      )}
    </div>
  );
}

export default function ChildrenSection({ memberId }: { memberId: string }) {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await api.get<{ children: Child[] }>(`/api/members/${memberId}/children`);
    setChildren(res.children);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function addChild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/members/${memberId}/children`, { name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add the child — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-foreground mb-1">Children</h2>
      <p className="text-xs text-muted mb-4">
        Each child gets their own QR code — an usher can scan it directly, or this member can check them in during
        the venue self-check-in flow.
      </p>

      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-3">{error}</div>}

      <div className="divide-y divide-border">
        {children === null && <p className="text-sm text-muted">Loading…</p>}
        {children?.length === 0 && <p className="text-sm text-muted">No children added yet.</p>}
        {children?.map((c) => (
          <ChildRow key={c.id} child={c} onChanged={load} />
        ))}
      </div>

      <form onSubmit={addChild} className="flex gap-2 mt-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
          placeholder="Child's name"
        />
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? "Adding…" : "Add child"}
        </button>
      </form>
    </div>
  );
}

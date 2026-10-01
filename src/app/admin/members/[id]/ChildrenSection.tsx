"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Child = { id: string; name: string; active: boolean; gender: string | null; department: string | null };

function EditChildForm({
  child,
  onSaved,
  onCancel,
}: {
  child: Child;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(child.name);
  const [gender, setGender] = useState(child.gender || "");
  const [department, setDepartment] = useState(child.department || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // PATCH accepts gender/department as explicit empty strings to clear
      // them — sending all three every time keeps a full-edit form simple
      // (see routes/children.js: a field left OUT of the body is what's
      // untouched, not an empty string).
      await api.patch(`/api/children/${child.id}`, { name: name.trim(), gender, department });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2 py-3">
      {error && <div className="text-xs text-danger bg-danger-soft rounded-lg px-2.5 py-1.5">{error}</div>}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
          placeholder="Child's name"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="input flex-1" aria-label="Gender">
          <option value="">Gender (not specified)</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="input flex-1"
          aria-label="Department"
        >
          <option value="">Department (not specified)</option>
          <option value="Youth">Youth</option>
          <option value="Children">Children</option>
          <option value="Men">Men</option>
          <option value="Leader">Leader</option>
          <option value="Women">Women</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary !py-1.5 !px-3 text-xs">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn btn-secondary !py-1.5 !px-3 text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ChildRow({ child, onChanged }: { child: Child; onChanged: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
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

  if (editing) {
    return (
      <EditChildForm
        child={child}
        onSaved={() => {
          setEditing(false);
          onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{child.name}</p>
            {(child.gender || child.department) && (
              <p className="text-xs text-muted">
                {[child.gender, child.department].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {!child.active && <span className="badge badge-muted">Inactive</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-primary hover:underline">
            Edit
          </button>
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
  const [gender, setGender] = useState("");
  const [department, setDepartment] = useState("");
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
      await api.post(`/api/members/${memberId}/children`, { name: name.trim(), gender, department });
      setName("");
      setGender("");
      setDepartment("");
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

      <form onSubmit={addChild} className="flex flex-col gap-2 mt-4">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
            placeholder="Child's name"
          />
          <button type="submit" disabled={pending} className="btn btn-secondary whitespace-nowrap">
            {pending ? "Adding…" : "Add child"}
          </button>
        </div>
        <div className="flex gap-2">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="input flex-1" aria-label="Gender">
            <option value="">Gender (not specified)</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="input flex-1"
            aria-label="Department"
          >
            <option value="">Department (not specified)</option>
            <option value="Youth">Youth</option>
            <option value="Children">Children</option>
            <option value="Men">Men</option>
            <option value="Leader">Leader</option>
            <option value="Women">Women</option>
          </select>
        </div>
      </form>
    </div>
  );
}

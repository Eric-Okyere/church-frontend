"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { StatTile } from "@/components/charts/StatTile";

type Visitor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: "visiting" | "converted";
  convertedMemberId: string | null;
  convertedAt: string | null;
  createdAt: string;
};

// A loose, friendly "how long have they been visiting" indicator — not
// used for anything functional, just to help an admin judge "for a while"
// at a glance. Conversion itself is never time-gated.
function timeSince(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "added today";
  if (days === 1) return "added 1 day ago";
  if (days < 30) return `added ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "added 1 month ago" : `added ${months} months ago`;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertGender, setConvertGender] = useState("");
  const [convertDepartment, setConvertDepartment] = useState("");

  async function load() {
    const res = await api.get<{ visitors: Visitor[] }>("/api/visitors");
    setVisitors(res.visitors);
  }

  useEffect(() => {
    load();
  }, []);

  const visiting = useMemo(() => (visitors || []).filter((v) => v.status === "visiting"), [visitors]);
  const converted = useMemo(() => (visitors || []).filter((v) => v.status === "converted"), [visitors]);

  async function addVisitor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/visitors", {
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
        notes: String(form.get("notes") || ""),
      });
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that visitor — try again.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(v: Visitor) {
    setEditingId(v.id);
    setEditName(v.name);
    setEditPhone(v.phone || "");
    setEditEmail(v.email || "");
    setEditNotes(v.notes || "");
    setError(null);
  }

  async function saveEdit(id: string) {
    setPending(true);
    setError(null);
    try {
      await api.patch(`/api/visitors/${id}`, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        notes: editNotes,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save those changes — try again.");
    } finally {
      setPending(false);
    }
  }

  async function removeVisitor(id: string) {
    setPending(true);
    try {
      await api.delete(`/api/visitors/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that visitor — try again.");
    } finally {
      setPending(false);
    }
  }

  function startConvert(id: string) {
    setConvertingId(id);
    setConvertGender("");
    setConvertDepartment("");
    setError(null);
  }

  async function convertVisitor(id: string) {
    setPending(true);
    setError(null);
    try {
      await api.post(`/api/visitors/${id}/convert-to-member`, {
        gender: convertGender,
        department: convertDepartment,
      });
      setConvertingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't convert that visitor — try again.");
    } finally {
      setPending(false);
    }
  }

  if (!visitors) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visitors</h1>
        <p className="text-sm text-muted mt-1">
          Keep a list of people who&apos;ve visited, and convert anyone to a full member whenever you&apos;re ready.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatTile label="Currently visiting" value={visiting.length} />
        <StatTile label="Converted to members" value={converted.length} />
      </div>

      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Add a visitor</h2>
        <form onSubmit={addVisitor} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Full name</label>
            <input name="name" required className="input" placeholder="Kwame Visitor" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-sm font-medium text-foreground">Phone</label>
            <input name="phone" className="input" placeholder="024 000 0000" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-sm font-medium text-foreground">Email (optional)</label>
            <input name="email" type="email" className="input" placeholder="kwame@email.com" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <input name="notes" className="input" placeholder="How they heard about us, who invited them…" />
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary">
            Add visitor
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Visiting ({visiting.length})</h2>
        {visiting.length === 0 ? (
          <p className="text-sm text-muted">No one on the visitor list right now.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {visiting.map((v) =>
              editingId === v.id ? (
                <div key={v.id} className="py-3 flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <input
                      className="input flex-1 min-w-[140px]"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      className="input flex-1 min-w-[120px]"
                      placeholder="Phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                    <input
                      className="input flex-1 min-w-[120px]"
                      placeholder="Email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                  <input
                    className="input"
                    placeholder="Notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary !py-1 !px-3 text-xs"
                      disabled={pending}
                      onClick={() => saveEdit(v.id)}
                    >
                      Save
                    </button>
                    <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={v.id} className="py-3 flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{v.name}</p>
                      <p className="text-xs text-muted">
                        {[v.phone, v.email].filter(Boolean).join(" · ") || "No contact info"} ·{" "}
                        {timeSince(v.createdAt)}
                      </p>
                      {v.notes && <p className="text-xs text-muted mt-0.5">{v.notes}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button className="btn btn-primary !py-1 !px-3 text-xs" onClick={() => startConvert(v.id)}>
                        Convert to member
                      </button>
                      <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => startEdit(v)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger !py-1 !px-3 text-xs"
                        disabled={pending}
                        onClick={() => removeVisitor(v.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {convertingId === v.id && (
                    <div className="bg-primary-soft rounded-lg p-3 flex flex-col gap-2">
                      <p className="text-xs text-muted">
                        This creates a full member profile for {v.name}. Any past visitor check-ins matching their
                        phone number will be linked to the new profile automatically.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <select
                          className="input !w-auto"
                          value={convertGender}
                          onChange={(e) => setConvertGender(e.target.value)}
                        >
                          <option value="">Gender (optional)</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <select
                          className="input !w-auto"
                          value={convertDepartment}
                          onChange={(e) => setConvertDepartment(e.target.value)}
                        >
                          <option value="">Department (optional)</option>
                          <option value="Youth">Youth</option>
                          <option value="Children">Children</option>
                          <option value="Men">Men</option>
                          <option value="Leader">Leader</option>
                          <option value="Women">Women</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-primary !py-1 !px-3 text-xs"
                          disabled={pending}
                          onClick={() => convertVisitor(v.id)}
                        >
                          Confirm conversion
                        </button>
                        <button
                          className="btn btn-secondary !py-1 !px-3 text-xs"
                          onClick={() => setConvertingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Converted ({converted.length})</h2>
        {converted.length === 0 ? (
          <p className="text-sm text-muted">No visitors have been converted to members yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {converted.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{v.name}</p>
                  <p className="text-xs text-muted">Converted {v.convertedAt ? formatDate(v.convertedAt) : ""}</p>
                </div>
                {v.convertedMemberId && (
                  <Link href={`/admin/members/${v.convertedMemberId}`} className="btn btn-secondary !py-1 !px-3 text-xs">
                    View member
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

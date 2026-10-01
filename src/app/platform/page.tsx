"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { StatTile } from "@/components/charts/StatTile";

type PaymentStatus = "paid" | "unpaid";

type Church = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  memberCount: number;
  adminName: string | null;
  adminUsername: string | null;
  paymentStatus: PaymentStatus;
  paymentNote: string | null;
  paymentUpdatedAt: string | null;
};

// Every registered church on the platform — who's signed up, whether
// they've paid (a manual status the platform admin sets themselves; see
// Church.js — there's no payment gateway wired into GraceTrack yet), and
// how many active members they have. This is the ONE dashboard that spans
// every church at once; everything else in the app is deliberately scoped
// to a single church.
export default function PlatformDashboard() {
  const [churches, setChurches] = useState<Church[] | null>(null);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<{ churches: Church[] }>("/api/platform/churches");
      setChurches(res.churches);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Couldn't load churches — try refreshing.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!churches) return null;
    const q = query.trim().toLowerCase();
    return churches.filter((c) => {
      if (paymentFilter !== "all" && c.paymentStatus !== paymentFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.adminName || "").toLowerCase().includes(q) ||
        (c.adminUsername || "").toLowerCase().includes(q)
      );
    });
  }, [churches, query, paymentFilter]);

  const stats = useMemo(() => {
    if (!churches) return null;
    const paid = churches.filter((c) => c.paymentStatus === "paid").length;
    return {
      totalChurches: churches.length,
      paid,
      unpaid: churches.length - paid,
      totalMembers: churches.reduce((sum, c) => sum + c.memberCount, 0),
    };
  }, [churches]);

  async function savePayment(church: Church, paymentStatus: PaymentStatus, paymentNote: string) {
    setSavingId(church.id);
    try {
      const res = await api.patch<{ church: Church }>(`/api/platform/churches/${church.id}/payment`, {
        paymentStatus,
        paymentNote,
      });
      setChurches((prev) => (prev ? prev.map((c) => (c.id === church.id ? res.church : c)) : prev));
      setEditingId(null);
    } catch {
      // Keep the row open on failure so the admin can see their edits and retry.
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">All churches</h1>
        <p className="text-muted text-sm mt-1">Every church registered on GraceTrack, and whether they&apos;ve paid.</p>
      </div>

      {loadError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{loadError}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total churches" value={stats?.totalChurches ?? "…"} />
        <StatTile label="Paid" value={stats?.paid ?? "…"} />
        <StatTile label="Unpaid" value={stats?.unpaid ?? "…"} />
        <StatTile label="Members, all churches" value={stats?.totalMembers ?? "…"} />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-foreground">Churches</h2>
          <div className="flex items-center gap-2">
            <select
              className="input w-auto"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as "all" | PaymentStatus)}
            >
              <option value="all">All payment statuses</option>
              <option value="paid">Paid only</option>
              <option value="unpaid">Unpaid only</option>
            </select>
            <input
              className="input max-w-[220px]"
              placeholder="Search name, slug, admin…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {!churches && !loadError && <p className="text-sm text-muted px-2 py-3">Loading…</p>}
        {churches && filtered && filtered.length === 0 && (
          <p className="text-sm text-muted px-2 py-3">No churches match.</p>
        )}

        <div className="flex flex-col divide-y divide-border -mx-2">
          {filtered?.map((church) => (
            <ChurchRow
              key={church.id}
              church={church}
              editing={editingId === church.id}
              saving={savingId === church.id}
              onEdit={() => setEditingId(church.id)}
              onCancel={() => setEditingId(null)}
              onSave={(status, note) => savePayment(church, status, note)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChurchRow({
  church,
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  church: Church;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (status: PaymentStatus, note: string) => void;
}) {
  const [status, setStatus] = useState<PaymentStatus>(church.paymentStatus);
  const [note, setNote] = useState(church.paymentNote || "");

  // Reset the draft fields whenever this row's edit panel is (re)opened,
  // so a previous edit's leftover draft never bleeds into the next one.
  useEffect(() => {
    if (editing) {
      setStatus(church.paymentStatus);
      setNote(church.paymentNote || "");
    }
  }, [editing, church.paymentStatus, church.paymentNote]);

  return (
    <div className="px-2 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{church.name}</p>
            <span className={`badge ${church.paymentStatus === "paid" ? "badge-success" : "badge-warning"}`}>
              {church.paymentStatus === "paid" ? "Paid" : "Unpaid"}
            </span>
            {!church.active && <span className="badge badge-muted">Inactive</span>}
          </div>
          <p className="text-xs text-muted mt-0.5">
            <Link href={`/venue/${church.slug}`} target="_blank" className="hover:underline">
              /venue/{church.slug}
            </Link>
            {church.adminName && (
              <>
                {" · admin "}
                {church.adminName}
                {church.adminUsername && ` (${church.adminUsername})`}
              </>
            )}
            {" · registered "}
            {formatDate(church.createdAt)}
          </p>
          {church.paymentNote && !editing && <p className="text-xs text-muted mt-0.5">Note: {church.paymentNote}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-sm text-foreground font-medium">{church.memberCount}</p>
          <p className="text-xs text-muted">members</p>
          {!editing && (
            <button onClick={onEdit} className="btn btn-secondary !px-2.5 !py-1.5 text-xs whitespace-nowrap">
              Update payment
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 bg-background rounded-lg p-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("paid")}
              className={`btn !px-3 !py-1.5 text-xs ${status === "paid" ? "btn-primary" : "btn-secondary"}`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setStatus("unpaid")}
              className={`btn !px-3 !py-1.5 text-xs ${status === "unpaid" ? "btn-primary" : "btn-secondary"}`}
            >
              Unpaid
            </button>
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Optional note — e.g. “Paid via MTN MoMo, covers Oct–Dec 2026”"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} disabled={saving} className="btn btn-secondary !px-3 !py-1.5 text-xs">
              Cancel
            </button>
            <button
              onClick={() => onSave(status, note)}
              disabled={saving}
              className="btn btn-primary !px-3 !py-1.5 text-xs"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

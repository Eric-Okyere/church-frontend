"use client";

import { use, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatMoney, todayIso } from "@/lib/utils";
import { StatTile } from "@/components/charts/StatTile";

type Levy = {
  id: string;
  name: string;
  description: string | null;
  amountPerMember: number;
  active: boolean;
};

type Progress = {
  memberId: string;
  memberName: string;
  paid: number;
  outstanding: number;
  fullyPaid: boolean;
};

type Contribution = {
  id: string;
  memberId: string;
  memberName: string | null;
  amount: number;
  date: string;
  note: string | null;
};

type Detail = {
  levy: Levy;
  totalCollected: number;
  progress: Progress[];
  contributions: Contribution[];
};

export default function LevyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingMemberId, setPayingMemberId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingLevy, setEditingLevy] = useState(false);

  async function load() {
    const res = await api.get<Detail>(`/api/levies/${id}`);
    setDetail(res);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startPayment(memberId: string) {
    setPayingMemberId(memberId);
    setPayAmount("");
    setPayNote("");
    setError(null);
  }

  async function recordPayment(memberId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/levies/${id}/contributions`, {
        memberId,
        amount: payAmount,
        date: todayIso(),
        note: payNote,
      });
      setPayingMemberId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record that payment — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeContribution(contributionId: string) {
    setBusy(true);
    try {
      await api.delete(`/api/levies/${id}/contributions/${contributionId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that record — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLevyEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/api/levies/${id}`, {
        name: String(form.get("name") || ""),
        description: String(form.get("description") || ""),
        amountPerMember: String(form.get("amountPerMember") || ""),
      });
      setEditingLevy(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save those changes — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!detail) return;
    setBusy(true);
    try {
      await api.patch(`/api/levies/${id}`, { active: !detail.levy.active });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return <p className="text-sm text-muted">Loading…</p>;

  const { levy, totalCollected, progress, contributions } = detail;
  const goal = levy.amountPerMember * progress.length;
  const fullyPaidCount = progress.filter((p) => p.fullyPaid).length;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{levy.name}</h1>
            {!levy.active && <span className="badge badge-muted">Closed</span>}
          </div>
          {levy.description && <p className="text-sm text-muted mt-1">{levy.description}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setEditingLevy((v) => !v)}>
            {editingLevy ? "Cancel" : "Edit levy"}
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={toggleActive}>
            {levy.active ? "Close levy" : "Reopen levy"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}

      {editingLevy && (
        <div className="card p-6">
          <form onSubmit={saveLevyEdit} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-sm font-medium text-foreground">Name</label>
              <input name="name" required defaultValue={levy.name} className="input" />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-sm font-medium text-foreground">Amount per member</label>
              <input
                name="amountPerMember"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={levy.amountPerMember}
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground">Description</label>
              <input name="description" defaultValue={levy.description || ""} className="input" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary">
              Save
            </button>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile label="Collected" value={formatMoney(totalCollected)} hint={`of ${formatMoney(goal)} goal`} />
        <StatTile label="Per member" value={formatMoney(levy.amountPerMember)} />
        <StatTile label="Fully paid" value={`${fullyPaidCount} of ${progress.length}`} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Member progress</h2>
        <div className="flex flex-col divide-y divide-border">
          {progress.map((p) => (
            <div key={p.memberId} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 font-medium text-foreground">{p.memberName}</div>
              <div className="text-sm text-muted w-28">{formatMoney(p.paid)} paid</div>
              {p.fullyPaid ? (
                <span className="badge badge-success">Fully paid</span>
              ) : (
                <span className="badge badge-warning">{formatMoney(p.outstanding)} owed</span>
              )}
              {payingMemberId === p.memberId ? (
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    autoFocus
                    className="input !w-24"
                    placeholder="Amount"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <input
                    className="input !w-36"
                    placeholder="Note (optional)"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                  <button
                    className="btn btn-primary !py-1 !px-3 text-xs"
                    disabled={busy || !payAmount}
                    onClick={() => recordPayment(p.memberId)}
                  >
                    Save
                  </button>
                  <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => setPayingMemberId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => startPayment(p.memberId)}>
                  Record payment
                </button>
              )}
            </div>
          ))}
          {progress.length === 0 && <p className="text-sm text-muted py-2">No active members to track yet.</p>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Payment history</h2>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted">No payments recorded yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {contributions.map((c) => (
              <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{c.memberName || "—"}</p>
                  {c.note && <p className="text-xs text-muted">{c.note}</p>}
                </div>
                <div className="text-sm text-muted w-32">{formatDate(c.date)}</div>
                <div className="font-semibold text-foreground w-28">{formatMoney(c.amount)}</div>
                <button
                  className="btn btn-danger !py-1 !px-3 text-xs"
                  disabled={busy}
                  onClick={() => removeContribution(c.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

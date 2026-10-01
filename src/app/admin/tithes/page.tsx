"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatMoney, todayIso } from "@/lib/utils";
import { StatTile } from "@/components/charts/StatTile";

type Member = { id: string; name: string };

type Tithe = {
  id: string;
  memberId: string;
  memberName: string | null;
  amount: number;
  date: string;
  note: string | null;
};

type EditState = { amount: string; date: string; note: string };

export default function TithesPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [tithes, setTithes] = useState<Tithe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ amount: "", date: "", note: "" });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const [membersRes, tithesRes] = await Promise.all([
      api.get<{ members: Member[] }>("/api/members?active=true"),
      api.get<{ tithes: Tithe[] }>("/api/tithes"),
    ]);
    setMembers(membersRes.members);
    setTithes(tithesRes.tithes);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/tithes", {
        memberId: String(form.get("memberId") || ""),
        amount: String(form.get("amount") || ""),
        date: String(form.get("date") || ""),
        note: String(form.get("note") || ""),
      });
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record that tithe — try again.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(t: Tithe) {
    setEditingId(t.id);
    setEditState({ amount: String(t.amount), date: t.date, note: t.note || "" });
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/api/tithes/${id}`, {
        amount: editState.amount,
        date: editState.date,
        note: editState.note,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that change — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTithe(id: string) {
    setBusyId(id);
    try {
      await api.delete(`/api/tithes/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that record — try again.");
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    if (!tithes) return null;
    const thisMonth = todayIso().slice(0, 7);
    const total = tithes.reduce((sum, t) => sum + t.amount, 0);
    const totalThisMonth = tithes.filter((t) => t.date.startsWith(thisMonth)).reduce((sum, t) => sum + t.amount, 0);
    return { total, totalThisMonth, count: tithes.length };
  }, [tithes]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tithes</h1>
        <p className="text-muted text-sm mt-1">Record and review tithe payments from your members.</p>
      </div>

      {stats && (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatTile label="Total recorded" value={formatMoney(stats.total)} />
          <StatTile label="This month" value={formatMoney(stats.totalThisMonth)} />
          <StatTile label="Records" value={stats.count} />
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Record a tithe</h2>
        {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-3">{error}</div>}
        {success && (
          <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2 mb-3">Tithe recorded.</div>
        )}
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <label className="text-sm font-medium text-foreground">Member</label>
            <select name="memberId" required className="input" defaultValue="">
              <option value="" disabled>
                Select a member
              </option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-sm font-medium text-foreground">Amount</label>
            <input name="amount" type="number" step="0.01" min="0.01" required className="input" placeholder="50.00" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Date</label>
            <input name="date" type="date" defaultValue={todayIso()} className="input" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Note (optional)</label>
            <input name="note" className="input" placeholder="e.g. cash, mobile money" />
          </div>
          <button type="submit" disabled={pending || !members?.length} className="btn btn-primary">
            {pending ? "Saving…" : "Record tithe"}
          </button>
        </form>
        {members && members.length === 0 && (
          <p className="text-xs text-muted mt-3">Add an active member first before recording a tithe.</p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">All records</h2>
        {!tithes ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tithes.length === 0 ? (
          <p className="text-sm text-muted">No tithes recorded yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {tithes.map((t) => (
              <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {editingId === t.id ? (
                  <>
                    <div className="flex-1 font-medium text-foreground">{t.memberName || "—"}</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input !w-28"
                      value={editState.amount}
                      onChange={(e) => setEditState((s) => ({ ...s, amount: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="input !w-40"
                      value={editState.date}
                      onChange={(e) => setEditState((s) => ({ ...s, date: e.target.value }))}
                    />
                    <input
                      className="input flex-1"
                      placeholder="Note"
                      value={editState.note}
                      onChange={(e) => setEditState((s) => ({ ...s, note: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary !py-1 !px-3 text-xs"
                        disabled={busyId === t.id}
                        onClick={() => saveEdit(t.id)}
                      >
                        Save
                      </button>
                      <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{t.memberName || "—"}</p>
                      {t.note && <p className="text-xs text-muted">{t.note}</p>}
                    </div>
                    <div className="text-sm text-muted w-32">{formatDate(t.date)}</div>
                    <div className="font-semibold text-foreground w-28 text-right sm:text-left">
                      {formatMoney(t.amount)}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => startEdit(t)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger !py-1 !px-3 text-xs"
                        disabled={busyId === t.id}
                        onClick={() => removeTithe(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

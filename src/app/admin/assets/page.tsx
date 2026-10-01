"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StatTile } from "@/components/charts/StatTile";

type Asset = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
};

type EditState = { name: string; quantity: string; notes: string };

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", quantity: "", notes: "" });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ assets: Asset[] }>("/api/assets");
    setAssets(res.assets);
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
      await api.post("/api/assets", {
        name: String(form.get("name") || ""),
        quantity: String(form.get("quantity") || ""),
        notes: String(form.get("notes") || ""),
      });
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that item — try again.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(a: Asset) {
    setEditingId(a.id);
    setEditState({ name: a.name, quantity: String(a.quantity), notes: a.notes || "" });
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/api/assets/${id}`, {
        name: editState.name,
        quantity: editState.quantity,
        notes: editState.notes,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that change — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeAsset(id: string) {
    setBusyId(id);
    try {
      await api.delete(`/api/assets/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that item — try again.");
    } finally {
      setBusyId(null);
    }
  }

  const totalItems = assets?.reduce((sum, a) => sum + a.quantity, 0) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Assets &amp; instruments</h1>
        <p className="text-muted text-sm mt-1">Keep track of the instruments and items your church owns.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatTile label="Distinct items" value={assets?.length ?? "—"} />
        <StatTile label="Total quantity" value={totalItems ?? "—"} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Add an item</h2>
        {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-3">{error}</div>}
        {success && <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2 mb-3">Item added.</div>}
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <label className="text-sm font-medium text-foreground">Item name</label>
            <input name="name" required className="input" placeholder="Keyboard" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <label className="text-sm font-medium text-foreground">Quantity</label>
            <input name="quantity" type="number" min="0" step="1" defaultValue={1} className="input" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <input name="notes" className="input" placeholder="Condition, location, etc." />
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Saving…" : "Add item"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Inventory</h2>
        {!assets ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted">No items added yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {assets.map((a) => (
              <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {editingId === a.id ? (
                  <>
                    <input
                      className="input flex-1"
                      value={editState.name}
                      onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input !w-24"
                      value={editState.quantity}
                      onChange={(e) => setEditState((s) => ({ ...s, quantity: e.target.value }))}
                    />
                    <input
                      className="input flex-1"
                      placeholder="Notes"
                      value={editState.notes}
                      onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary !py-1 !px-3 text-xs"
                        disabled={busyId === a.id}
                        onClick={() => saveEdit(a.id)}
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
                      <p className="font-medium text-foreground">{a.name}</p>
                      {a.notes && <p className="text-xs text-muted">{a.notes}</p>}
                    </div>
                    <div className="text-sm text-foreground w-20">× {a.quantity}</div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary !py-1 !px-3 text-xs" onClick={() => startEdit(a)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger !py-1 !px-3 text-xs"
                        disabled={busyId === a.id}
                        onClick={() => removeAsset(a.id)}
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

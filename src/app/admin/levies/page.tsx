"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

type Levy = {
  id: string;
  name: string;
  description: string | null;
  amountPerMember: number;
  active: boolean;
  totalCollected: number;
  contributorCount: number;
  memberCount: number;
};

export default function LeviesPage() {
  const [levies, setLevies] = useState<Levy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await api.get<{ levies: Levy[] }>("/api/levies");
    setLevies(res.levies);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/levies", {
        name: String(form.get("name") || ""),
        description: String(form.get("description") || ""),
        amountPerMember: String(form.get("amountPerMember") || ""),
      });
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that levy — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Levies</h1>
        <p className="text-muted text-sm mt-1">
          Create a named contribution drive with a fixed amount per member, and track who&apos;s paid.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Create a levy</h2>
        {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-3">{error}</div>}
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Name</label>
            <input name="name" required className="input" placeholder="Building Fund 2026" />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Amount per member</label>
            <input name="amountPerMember" type="number" step="0.01" min="0.01" required className="input" placeholder="100.00" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Description (optional)</label>
            <input name="description" className="input" placeholder="What this levy is for" />
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Creating…" : "Create levy"}
          </button>
        </form>
      </div>

      {!levies ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : levies.length === 0 ? (
        <p className="text-sm text-muted">No levies yet — create one above.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {levies.map((l) => {
            // The "goal" is every active member paying their full share —
            // not a stored target, just amountPerMember × how many active
            // members there are right now.
            const goal = l.amountPerMember * l.memberCount;
            const pct = goal > 0 ? Math.min(100, Math.round((l.totalCollected / goal) * 100)) : 0;
            return (
              <Link key={l.id} href={`/admin/levies/${l.id}`} className="card p-5 flex flex-col gap-2 hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{l.name}</h3>
                  {!l.active && <span className="badge badge-muted">Closed</span>}
                </div>
                {l.description && <p className="text-sm text-muted">{l.description}</p>}
                <p className="text-sm text-muted mt-1">
                  {formatMoney(l.amountPerMember)} per member · {l.contributorCount} of {l.memberCount} contributed
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatMoney(l.totalCollected)} <span className="text-sm font-normal text-muted">of {formatMoney(goal)} goal</span>
                </p>
                <div className="h-2 rounded-full bg-border overflow-hidden mt-1">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

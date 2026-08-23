"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AddMemberForm from "./AddMemberForm";

type Member = { id: string; name: string; phone: string | null; email: string | null; active: boolean };

export default function MembersPage() {
  const [active, setActive] = useState<Member[] | null>(null);
  const [inactive, setInactive] = useState<Member[]>([]);

  async function load() {
    const [activeRes, inactiveRes] = await Promise.all([
      api.get<{ members: Member[] }>("/api/members?active=true"),
      api.get<{ members: Member[] }>("/api/members?active=false"),
    ]);
    setActive([...activeRes.members].sort((a, b) => a.name.localeCompare(b.name)));
    setInactive(inactiveRes.members);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Members</h1>
        <p className="text-muted text-sm mt-1">
          {active === null ? "…" : `${active.length} active member${active.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Add a member</h2>
        <AddMemberForm onAdded={load} />
      </div>

      <div className="card divide-y divide-border">
        {active === null && <p className="p-5 text-sm text-muted">Loading…</p>}
        {active?.length === 0 && <p className="p-5 text-sm text-muted">No members yet — add your first one above.</p>}
        {active?.map((m) => (
          <Link
            key={m.id}
            href={`/admin/members/${m.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-primary-soft/40 transition-colors"
          >
            <div>
              <p className="font-medium text-foreground">{m.name}</p>
              <p className="text-xs text-muted">{m.phone || m.email || "No contact info"}</p>
            </div>
            <span className="text-xs font-semibold text-primary">View QR & history →</span>
          </Link>
        ))}
      </div>

      {inactive.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            {inactive.length} inactive member{inactive.length === 1 ? "" : "s"}
          </summary>
          <div className="flex flex-col divide-y divide-border mt-3">
            {inactive.map((m) => (
              <Link key={m.id} href={`/admin/members/${m.id}`} className="py-2 text-sm text-muted hover:text-foreground">
                {m.name}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { telHref, whatsappHref } from "@/lib/utils";
import AddMemberForm from "./AddMemberForm";
import { StatTile } from "@/components/charts/StatTile";
import { MagnitudeBarChart } from "@/components/charts/MagnitudeBarChart";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  department: string | null;
  createdAt: string;
};

type SortKey = "name" | "newest" | "oldest" | "department";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name (A–Z)",
  newest: "Newest first",
  oldest: "Oldest first",
  department: "Department",
};

export default function MembersPage() {
  const [active, setActive] = useState<Member[] | null>(null);
  const [inactive, setInactive] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  async function load() {
    const [activeRes, inactiveRes] = await Promise.all([
      api.get<{ members: Member[] }>("/api/members?active=true"),
      api.get<{ members: Member[] }>("/api/members?active=false"),
    ]);
    setActive(activeRes.members);
    setInactive(inactiveRes.members);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredSortedActive = useMemo(() => {
    if (!active) return null;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? active.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.phone || "").toLowerCase().includes(q) ||
            (m.email || "").toLowerCase().includes(q)
        )
      : active;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "department":
          return (a.department || "￿").localeCompare(b.department || "￿") || a.name.localeCompare(b.name);
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [active, query, sortBy]);

  const departmentChartData = useMemo(() => {
    if (!active) return [];
    const counts = new Map<string, number>();
    for (const m of active) {
      const key = m.department || "No department";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [active]);

  const totalCount = (active?.length ?? 0) + inactive.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Members</h1>
        <p className="text-muted text-sm mt-1">Everyone registered at your church.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Total members" value={active === null ? "…" : totalCount.toLocaleString()} />
        <StatTile label="Active" value={active === null ? "…" : active.length.toLocaleString()} />
        <StatTile label="Inactive" value={inactive.length.toLocaleString()} />
      </div>

      {active !== null && active.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-foreground mb-1">Members by department</h2>
          <p className="text-xs text-muted mb-4">Active members only.</p>
          <MagnitudeBarChart data={departmentChartData} />
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">Add a member</h2>
        <AddMemberForm onAdded={load} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by name, phone, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort by
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="input !w-auto py-1.5">
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card divide-y divide-border">
        {filteredSortedActive === null && <p className="p-5 text-sm text-muted">Loading…</p>}
        {filteredSortedActive?.length === 0 && (
          <p className="p-5 text-sm text-muted">
            {query ? "No members match your search." : "No members yet — add your first one above."}
          </p>
        )}
        {filteredSortedActive?.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-primary-soft/40 transition-colors">
            <Link href={`/admin/members/${m.id}`} className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{m.name}</p>
              <p className="text-xs text-muted truncate">
                {m.phone || m.email || "No contact info"}
                {m.department ? ` · ${m.department}` : ""}
              </p>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              {m.phone && (
                <>
                  <a
                    href={telHref(m.phone)}
                    onClick={(e) => e.stopPropagation()}
                    className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                    title={`Call ${m.name}`}
                  >
                    📞
                  </a>
                  <a
                    href={whatsappHref(m.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                    title={`WhatsApp ${m.name}`}
                  >
                    💬
                  </a>
                </>
              )}
              <Link href={`/admin/members/${m.id}`} className="text-xs font-semibold text-primary whitespace-nowrap">
                View →
              </Link>
            </div>
          </div>
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

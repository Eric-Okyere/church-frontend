"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { telHref, whatsappHref } from "@/lib/utils";
import AddMemberForm from "./AddMemberForm";
import MemberImport from "./MemberImport";
import { StatTile } from "@/components/charts/StatTile";
import { MagnitudeBarChart } from "@/components/charts/MagnitudeBarChart";
import { CategoricalBreakdownChart } from "@/components/charts/CategoricalBreakdownChart";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  gender: string | null;
  department: string | null;
  createdAt: string;
};

// A member's child, dependent — added from that member's own profile page
// (ChildrenSection), but surfaced here too, clearly marked, so the Members
// page is a complete picture of everyone registered, not members-only.
type ChildRow = {
  id: string;
  name: string;
  parentMemberId: string;
  parentName: string | null;
  parentPhone: string | null;
  active: boolean;
  createdAt: string;
};

type ListRow = { kind: "member"; member: Member } | { kind: "child"; child: ChildRow };

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
  const [activeChildren, setActiveChildren] = useState<ChildRow[]>([]);
  const [inactiveChildren, setInactiveChildren] = useState<ChildRow[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  async function load() {
    const [activeRes, inactiveRes, activeChildrenRes, inactiveChildrenRes] = await Promise.all([
      api.get<{ members: Member[] }>("/api/members?active=true"),
      api.get<{ members: Member[] }>("/api/members?active=false"),
      api.get<{ children: ChildRow[] }>("/api/children?active=true"),
      api.get<{ children: ChildRow[] }>("/api/children?active=false"),
    ]);
    setActive(activeRes.members);
    setInactive(inactiveRes.members);
    setActiveChildren(activeChildrenRes.children);
    setInactiveChildren(inactiveChildrenRes.children);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredSortedRows = useMemo(() => {
    if (!active) return null;
    const q = query.trim().toLowerCase();

    const memberRows: ListRow[] = active
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          (m.phone || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q)
      )
      .map((member) => ({ kind: "member" as const, member }));

    const childRows: ListRow[] = activeChildren
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.parentName || "").toLowerCase().includes(q) ||
          (c.parentPhone || "").toLowerCase().includes(q)
      )
      .map((child) => ({ kind: "child" as const, child }));

    const rows = [...memberRows, ...childRows];
    const nameOf = (r: ListRow) => (r.kind === "member" ? r.member.name : r.child.name);
    const createdAtOf = (r: ListRow) => (r.kind === "member" ? r.member.createdAt : r.child.createdAt);
    // A child has no department of their own — they sort into the same
    // "no department" bucket a department-less member already falls into,
    // rather than needing a special case.
    const departmentOf = (r: ListRow) => (r.kind === "member" ? r.member.department : null);

    rows.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(createdAtOf(b)).getTime() - new Date(createdAtOf(a)).getTime();
        case "oldest":
          return new Date(createdAtOf(a)).getTime() - new Date(createdAtOf(b)).getTime();
        case "department":
          return (departmentOf(a) || "￿").localeCompare(departmentOf(b) || "￿") || nameOf(a).localeCompare(nameOf(b));
        case "name":
        default:
          return nameOf(a).localeCompare(nameOf(b));
      }
    });
    return rows;
  }, [active, activeChildren, query, sortBy]);

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

  // Fixed order (Male, Female, Not specified) so a gender's color/position
  // never shifts as counts change — same convention as the analytics
  // page's check-in-method chart.
  const genderChartData = useMemo(() => {
    if (!active) return [];
    const counts = { Male: 0, Female: 0, "Not specified": 0 };
    for (const m of active) {
      if (m.gender === "Male") counts.Male++;
      else if (m.gender === "Female") counts.Female++;
      else counts["Not specified"]++;
    }
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
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
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card p-6">
            <h2 className="font-semibold text-foreground mb-1">Members by department</h2>
            <p className="text-xs text-muted mb-4">Active members only.</p>
            <MagnitudeBarChart data={departmentChartData} />
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-foreground mb-1">Members by gender</h2>
            <p className="text-xs text-muted mb-4">Active members only.</p>
            <CategoricalBreakdownChart data={genderChartData} />
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-foreground">Add a member</h2>
        </div>
        <AddMemberForm onAdded={load} />
      </div>

      <MemberImport onImported={load} />

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
        {filteredSortedRows === null && <p className="p-5 text-sm text-muted">Loading…</p>}
        {filteredSortedRows?.length === 0 && (
          <p className="p-5 text-sm text-muted">
            {query ? "No members or children match your search." : "No members yet — add your first one above."}
          </p>
        )}
        {filteredSortedRows?.map((row) =>
          row.kind === "member" ? (
            <div
              key={`m-${row.member.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-primary-soft/40 transition-colors"
            >
              <Link href={`/admin/members/${row.member.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{row.member.name}</p>
                <p className="text-xs text-muted truncate">
                  {row.member.phone || row.member.email || "No contact info"}
                  {row.member.gender ? ` · ${row.member.gender}` : ""}
                  {row.member.department ? ` · ${row.member.department}` : ""}
                </p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {row.member.phone && (
                  <>
                    <a
                      href={telHref(row.member.phone)}
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                      title={`Call ${row.member.name}`}
                    >
                      📞
                    </a>
                    <a
                      href={whatsappHref(row.member.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                      title={`WhatsApp ${row.member.name}`}
                    >
                      💬
                    </a>
                  </>
                )}
                <Link href={`/admin/members/${row.member.id}`} className="text-xs font-semibold text-primary whitespace-nowrap">
                  View →
                </Link>
              </div>
            </div>
          ) : (
            <div
              key={`c-${row.child.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-primary-soft/40 transition-colors"
            >
              <Link href={`/admin/members/${row.child.parentMemberId}`} className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {row.child.name} <span className="badge badge-muted">Child</span>
                </p>
                <p className="text-xs text-muted truncate">Child of {row.child.parentName || "unknown parent"}</p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {row.child.parentPhone && (
                  <>
                    <a
                      href={telHref(row.child.parentPhone)}
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                      title={`Call ${row.child.parentName || "parent"}`}
                    >
                      📞
                    </a>
                    <a
                      href={whatsappHref(row.child.parentPhone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                      title={`WhatsApp ${row.child.parentName || "parent"}`}
                    >
                      💬
                    </a>
                  </>
                )}
                <Link href={`/admin/members/${row.child.parentMemberId}`} className="text-xs font-semibold text-primary whitespace-nowrap">
                  View parent →
                </Link>
              </div>
            </div>
          )
        )}
      </div>

      {(inactive.length > 0 || inactiveChildren.length > 0) && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            {inactive.length} inactive member{inactive.length === 1 ? "" : "s"}
            {inactiveChildren.length > 0
              ? ` · ${inactiveChildren.length} inactive child${inactiveChildren.length === 1 ? "" : "ren"}`
              : ""}
          </summary>
          <div className="flex flex-col divide-y divide-border mt-3">
            {inactive.map((m) => (
              <Link key={`m-${m.id}`} href={`/admin/members/${m.id}`} className="py-2 text-sm text-muted hover:text-foreground">
                {m.name}
              </Link>
            ))}
            {inactiveChildren.map((c) => (
              <Link
                key={`c-${c.id}`}
                href={`/admin/members/${c.parentMemberId}`}
                className="py-2 text-sm text-muted hover:text-foreground"
              >
                {c.name} <span className="text-xs">· Child of {c.parentName || "unknown parent"}</span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

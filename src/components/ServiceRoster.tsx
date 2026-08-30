"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { telHref, whatsappHref } from "@/lib/utils";

type RosterMember = { id: string; name: string; phone: string | null; checkedInAt?: string };
type Visitor = { id: string; name: string; phone: string | null; checkedInAt: string };

type AttendanceResponse = {
  roster?: { presentMembers: RosterMember[]; absentMembers: RosterMember[] };
  visitors?: Visitor[];
};

const TABS = [
  { key: "absent", label: "Absent" },
  { key: "present", label: "Present" },
  { key: "visitors", label: "Visitors" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Shows the church WHO — not just how many — is present, absent, or a
// visitor for this service, so an admin can actually call or WhatsApp a
// specific person to check on them (an absent member) or say thanks for
// coming (a present member/visitor). Complements the compact count-only
// summary already on `LiveAttendance` — this is the detail view behind
// those counts. Defaults to the "Absent" tab since following up with
// absent members is the main reason to open this.
export default function ServiceRoster({ serviceId }: { serviceId: string }) {
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [tab, setTab] = useState<TabKey>("absent");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await api.get<AttendanceResponse>(`/api/services/${serviceId}/attendance`);
    setData(res);
  }, [serviceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const present = useMemo(() => data?.roster?.presentMembers ?? [], [data]);
  const absent = useMemo(() => data?.roster?.absentMembers ?? [], [data]);
  const visitors = useMemo(() => data?.visitors ?? [], [data]);

  const activeList: (RosterMember | Visitor)[] = tab === "present" ? present : tab === "absent" ? absent : visitors;
  const filtered = query.trim()
    ? activeList.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : activeList;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-semibold text-foreground">Who&apos;s present / absent</h2>
        <input
          className="input max-w-[200px]"
          placeholder="Search name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-1 mb-4">
        {TABS.map((t) => {
          const count = t.key === "present" ? present.length : t.key === "absent" ? absent.length : visitors.length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-primary-soft text-primary" : "text-muted hover:bg-primary-soft/50"
              }`}
            >
              {t.label} <span className="text-xs">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col divide-y divide-border max-h-96 overflow-y-auto -mx-2">
        {!data && <p className="text-sm text-muted px-2 py-3">Loading…</p>}
        {data && filtered.length === 0 && (
          <p className="text-sm text-muted px-2 py-3">
            {activeList.length === 0
              ? tab === "absent"
                ? "Everyone active is checked in — no one absent."
                : tab === "present"
                  ? "No one checked in yet."
                  : "No visitors yet."
              : "No matches."}
          </p>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-2 py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-xs text-muted">
                {p.phone ?? "No phone on file"}
                {"checkedInAt" in p && p.checkedInAt && <> · checked in {timeLabel(p.checkedInAt)}</>}
              </p>
            </div>
            {p.phone && (
              <div className="flex gap-2 shrink-0">
                <a href={telHref(p.phone)} className="btn btn-secondary !px-2.5 !py-1.5 text-xs" title={`Call ${p.name}`}>
                  📞
                </a>
                <a
                  href={whatsappHref(p.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                  title={`WhatsApp ${p.name}`}
                >
                  💬
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

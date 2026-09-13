"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { telHref, whatsappHref } from "@/lib/utils";
import { premisesErrorMessage, reasonFromError, useAdminLocation } from "@/lib/geolocation";

type RosterMember = {
  id: string;
  name: string;
  phone: string | null;
  checkedInAt?: string;
  // Set when an admin/usher checked this member in on their behalf (kiosk
  // scan, manual, or a shared admin QR link) rather than the member
  // self-checking-in at the venue — surfaces who to ask if there's ever a
  // question about a check-in recorded under pressure at a busy door.
  checkedInByName?: string | null;
};
type Visitor = { id: string; name: string; phone: string | null; checkedInAt: string; checkedInByName?: string | null };

type AttendanceResponse = {
  roster?: { presentMembers: RosterMember[]; absentMembers: RosterMember[] };
  visitors?: Visitor[];
};

type ManualCheckInResult = { ok: boolean; alreadyIn?: boolean; memberName?: string; reason?: string };

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
  // One-click "Mark present" straight from the Absent list — an usher can
  // already see the name here, so there's no need to send them over to the
  // search box below to check someone in. Reuses the exact same
  // admin-on-premises manual check-in route (`/api/attendance/manual`) that
  // powers that search box, so it's still gated by the same location
  // requirement and still records `checkedInByName` for this usher.
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { coordsRef, locationError, retryLocation } = useAdminLocation();

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

  async function markPresent(member: RosterMember) {
    setCheckingInId(member.id);
    setActionMessage(null);
    setActionError(null);
    try {
      const coords = coordsRef.current;
      const result = await api.post<ManualCheckInResult>("/api/attendance/manual", {
        memberId: member.id,
        serviceId,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      if (result.ok) {
        setActionMessage(result.alreadyIn ? `${member.name} was already checked in.` : `${member.name} marked present ✓`);
        load(); // refresh immediately so they move out of Absent without waiting for the next poll
      } else {
        setActionError(`Couldn't mark ${member.name} present — please try again.`);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 403
          ? premisesErrorMessage(reasonFromError(err))
          : `Couldn't mark ${member.name} present — please try again.`
      );
    } finally {
      setCheckingInId(null);
    }
  }

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

      {tab === "absent" && locationError && (
        <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 flex items-center justify-between gap-3 mb-4">
          <span>{locationError}</span>
          <button className="font-semibold hover:underline shrink-0" onClick={retryLocation}>
            Try again
          </button>
        </div>
      )}
      {actionMessage && <p className="text-sm text-success mb-3">{actionMessage}</p>}
      {actionError && <p className="text-sm text-danger mb-3">{actionError}</p>}

      <div className="flex gap-1 mb-4">
        {TABS.map((t) => {
          const count = t.key === "present" ? present.length : t.key === "absent" ? absent.length : visitors.length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setActionMessage(null);
                setActionError(null);
              }}
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
                {"checkedInByName" in p && p.checkedInByName && <> · by {p.checkedInByName}</>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {tab === "absent" && (
                <button
                  onClick={() => markPresent(p as RosterMember)}
                  disabled={checkingInId === p.id}
                  className="btn btn-primary !px-2.5 !py-1.5 text-xs whitespace-nowrap"
                  title={`Mark ${p.name} present`}
                >
                  {checkingInId === p.id ? "Marking…" : "Mark present"}
                </button>
              )}
              {p.phone && (
                <>
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
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

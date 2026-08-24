"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type ChildResult = { id: string; name: string; parentName: string | null };

// A unified row for the search results list — either a member or a child,
// distinguished by `kind` so checkIn() knows which id field to send.
type ResultRow =
  | { kind: "member"; id: string; name: string; phone: string | null }
  | { kind: "child"; id: string; name: string; parentName: string | null };

type CheckInResult = { ok: boolean; alreadyIn?: boolean; memberName?: string };

export default function ManualCheckIn({ serviceId }: { serviceId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showVisitor, setShowVisitor] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    setMessage(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const [membersData, childrenData] = await Promise.all([
          api.get<{ members: Member[] }>(`/api/members/search?q=${encodeURIComponent(value)}`),
          api.get<{ children: ChildResult[] }>(`/api/children/search?q=${encodeURIComponent(value)}`),
        ]);
        setResults([
          ...membersData.members.map((m): ResultRow => ({ kind: "member", id: m.id, name: m.name, phone: m.phone })),
          ...childrenData.children.map((c): ResultRow => ({ kind: "child", id: c.id, name: c.name, parentName: c.parentName })),
        ]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }

  async function checkIn(row: ResultRow) {
    const result = await api.post<CheckInResult>("/api/attendance/manual", {
      ...(row.kind === "member" ? { memberId: row.id } : { childId: row.id }),
      serviceId,
    });
    if (result.ok) {
      setMessage(result.alreadyIn ? `${result.memberName} was already checked in.` : `${result.memberName} checked in ✓`);
    } else {
      setMessage("Couldn't check in — please try again.");
    }
    setQuery("");
    setResults([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          className="input"
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {message && <p className="text-sm text-success mt-2">{message}</p>}
      </div>

      <div className="flex flex-col divide-y divide-border max-h-64 overflow-y-auto">
        {searching && query && <p className="text-sm text-muted py-2">Searching…</p>}
        {!searching &&
          results.map((row) => (
            <button
              key={`${row.kind}-${row.id}`}
              onClick={() => checkIn(row)}
              className="flex items-center justify-between py-2.5 text-left hover:bg-primary-soft/50 rounded-lg px-2 -mx-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {row.name}
                  {row.kind === "child" && <span className="badge badge-muted ml-2">Child</span>}
                </p>
                {row.kind === "member" && row.phone && <p className="text-xs text-muted">{row.phone}</p>}
                {row.kind === "child" && row.parentName && (
                  <p className="text-xs text-muted">Child of {row.parentName}</p>
                )}
              </div>
              <span className="text-xs font-semibold text-primary">Check in →</span>
            </button>
          ))}
        {!searching && query && results.length === 0 && (
          <p className="text-sm text-muted py-2">No matches. Add them as a visitor below, or from the Members page.</p>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        {!showVisitor ? (
          <button className="text-sm font-medium text-primary hover:underline" onClick={() => setShowVisitor(true)}>
            + Add a visitor / walk-in
          </button>
        ) : (
          <VisitorForm
            serviceId={serviceId}
            onDone={(msg) => {
              setMessage(msg);
              setShowVisitor(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function VisitorForm({ serviceId, onDone }: { serviceId: string; onDone: (msg: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setPending(true);
    try {
      await api.post("/api/attendance/visitor", { serviceId, name, phone });
      onDone(`${name} checked in as a visitor ✓`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <input className="input" placeholder="Visitor name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <button className="btn btn-primary" disabled={pending || !name.trim()} onClick={submit}>
        {pending ? "Adding…" : "Check in visitor"}
      </button>
    </div>
  );
}

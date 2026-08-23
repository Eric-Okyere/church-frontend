"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import CreateServiceForm from "./CreateServiceForm";

type Service = { id: string; name: string; date: string; status: string };
type AttendanceSummary = { count: number; attendance: unknown[] };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  async function load() {
    const res = await api.get<{ services: Service[] }>("/api/services");
    setServices(res.services);
    const entries = await Promise.all(
      res.services.map(async (s) => {
        const a = await api.get<AttendanceSummary>(`/api/services/${s.id}/attendance`);
        return [s.id, a.count] as const;
      })
    );
    setCounts(Object.fromEntries(entries));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Services</h1>
        <p className="text-muted text-sm mt-1">Create and manage services or events.</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-4">New service</h2>
        <CreateServiceForm onCreated={load} />
      </div>

      <div className="card divide-y divide-border">
        {services === null && <p className="p-5 text-sm text-muted">Loading…</p>}
        {services?.length === 0 && <p className="p-5 text-sm text-muted">No services yet.</p>}
        {services?.map((s) => (
          <Link
            key={s.id}
            href={`/admin/services/${s.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-primary-soft/40 transition-colors"
          >
            <div>
              <p className="font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted">{formatDate(s.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">{counts[s.id] ?? 0} present</span>
              {s.status === "active" && <span className="badge badge-success">Active</span>}
              {s.status === "ended" && <span className="badge badge-muted">Ended</span>}
              {s.status === "scheduled" && <span className="badge badge-warning">Scheduled</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

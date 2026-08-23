"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import CreateServiceForm from "./services/CreateServiceForm";

type DashboardData = {
  activeService: { id: string; name: string; date: string } | null;
  activeCount: number;
  memberCount: number;
  recentServices: { id: string; name: string; date: string; status: string; count: number }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await api.get<DashboardData>("/api/dashboard");
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Welcome back — here&apos;s what&apos;s happening.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-muted">Active members</p>
          <p className="text-3xl font-semibold text-foreground mt-1">{data.memberCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Services logged</p>
          <p className="text-3xl font-semibold text-foreground mt-1">{data.recentServices.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Currently checked in</p>
          <p className="text-3xl font-semibold text-foreground mt-1">{data.activeCount}</p>
        </div>
      </div>

      {data.activeService ? (
        <div className="card p-6 border-l-4" style={{ borderLeftColor: "var(--success)" }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="badge badge-success mb-2">● Live now</span>
              <h2 className="text-lg font-semibold text-foreground">{data.activeService.name}</h2>
              <p className="text-sm text-muted">{formatDate(data.activeService.date)}</p>
              <p className="text-sm text-foreground mt-2">
                <span className="font-semibold">{data.activeCount}</span> people checked in so far
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/scan" className="btn btn-primary">
                Open check-in kiosk
              </Link>
              <Link href={`/admin/services/${data.activeService.id}`} className="btn btn-secondary">
                View details
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">No service is active</h2>
          <p className="text-sm text-muted mb-4">
            Start a service to begin taking attendance — members can then check in with their QR code.
          </p>
          <CreateServiceForm onCreated={load} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Recent services</h2>
          <Link href="/admin/services" className="text-sm text-primary font-medium hover:underline">
            View all
          </Link>
        </div>
        <div className="card divide-y divide-border">
          {data.recentServices.length === 0 && (
            <p className="p-5 text-sm text-muted">No services yet. Create your first one above.</p>
          )}
          {data.recentServices.map((s) => (
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
                <span className="text-sm text-muted">{s.count} present</span>
                {s.status === "active" && <span className="badge badge-success">Active</span>}
                {s.status === "ended" && <span className="badge badge-muted">Ended</span>}
                {s.status === "scheduled" && <span className="badge badge-warning">Scheduled</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

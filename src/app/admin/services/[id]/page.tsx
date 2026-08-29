"use client";

import { use, useEffect, useState } from "react";
import { api, downloadCsv } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import LiveAttendance from "@/components/LiveAttendance";
import ManualCheckIn from "@/components/ManualCheckIn";
import ServiceDemographics from "@/components/ServiceDemographics";

type Service = { id: string; name: string; date: string; status: "scheduled" | "active" | "ended" };

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [service, setService] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get<{ service: Service }>(`/api/services/${id}`);
    setService(res.service);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function activate() {
    setBusy(true);
    try {
      await api.post(`/api/services/${id}/activate`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    setBusy(true);
    try {
      await api.post(`/api/services/${id}/end`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    if (!service) return;
    await downloadCsv(`/api/services/${id}/attendance/csv`, `${service.name.replace(/\s+/g, "_")}_attendance.csv`);
  }

  if (!service) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-foreground">{service.name}</h1>
            {service.status === "active" && <span className="badge badge-success">● Live</span>}
            {service.status === "ended" && <span className="badge badge-muted">Ended</span>}
            {service.status === "scheduled" && <span className="badge badge-warning">Scheduled</span>}
          </div>
          <p className="text-muted text-sm">{formatDate(service.date)}</p>
        </div>
        <div className="flex gap-2">
          {service.status !== "active" && (
            <button className="btn btn-primary" disabled={busy} onClick={activate}>
              Make active
            </button>
          )}
          {service.status === "active" && (
            <button className="btn btn-secondary" disabled={busy} onClick={end}>
              End service
            </button>
          )}
          <button className="btn btn-secondary" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {service.status === "active" && (
          <div className="card p-6">
            <h2 className="font-semibold text-foreground mb-4">Manual check-in</h2>
            <ManualCheckIn serviceId={service.id} />
          </div>
        )}
        <div className={service.status === "active" ? "" : "lg:col-span-2"}>
          <LiveAttendance serviceId={service.id} />
        </div>
      </div>

      <ServiceDemographics serviceId={service.id} />
    </div>
  );
}

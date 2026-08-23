"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import RequireAuth from "@/components/RequireAuth";
import LiveAttendance from "@/components/LiveAttendance";
import ManualCheckIn from "@/components/ManualCheckIn";
import CreateServiceForm from "../admin/services/CreateServiceForm";
import Scanner from "./Scanner";

type DashboardData = {
  activeService: { id: string; name: string; date: string } | null;
};

function ScanPageInner() {
  const [service, setService] = useState<DashboardData["activeService"]>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await api.get<DashboardData>("/api/dashboard");
    setService(res.activeService);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-sm text-muted p-8">Loading…</p>;

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="card p-8 max-w-md w-full">
          <h1 className="text-lg font-semibold text-foreground mb-1">No service is active</h1>
          <p className="text-sm text-muted mb-5">Start a service before opening the check-in kiosk.</p>
          <CreateServiceForm onCreated={load} />
          <Link href="/admin" className="block text-center text-sm text-primary mt-5 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Check-in kiosk</p>
            <h1 className="font-semibold text-foreground">
              {service.name} · {formatDate(service.date)}
            </h1>
          </div>
          <Link href="/admin" className="btn btn-secondary">
            Exit kiosk
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <Scanner />
          <div className="card p-6">
            <h2 className="font-semibold text-foreground mb-4">Manual check-in</h2>
            <ManualCheckIn serviceId={service.id} />
          </div>
        </div>
        <LiveAttendance serviceId={service.id} />
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <RequireAuth>
      <ScanPageInner />
    </RequireAuth>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { StatTile } from "@/components/charts/StatTile";
import { MagnitudeBarChart } from "@/components/charts/MagnitudeBarChart";
import { CategoricalBreakdownChart } from "@/components/charts/CategoricalBreakdownChart";

type Totals = { servicesCount: number; totalCheckIns: number; avgAttendance: number; activeMembers: number };
type ServiceRow = { id: string; name: string; date: string; status: string; count: number };
type MethodRow = { method: string; label: string; count: number };

export default function AnalyticsPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [perService, setPerService] = useState<ServiceRow[]>([]);
  const [methodBreakdown, setMethodBreakdown] = useState<MethodRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ totals: Totals; perService: ServiceRow[]; methodBreakdown: MethodRow[] }>("/api/analytics/services")
      .then((data) => {
        setTotals(data.totals);
        setPerService(data.perService);
        setMethodBreakdown(data.methodBreakdown);
      })
      .catch(() => setError("Couldn't load analytics — please try again."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Service analytics</h1>
        <p className="text-muted text-sm mt-1">How your services and check-ins have been trending.</p>
      </div>

      {error && <p className="card p-5 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Services held" value={totals ? totals.servicesCount.toLocaleString() : "…"} />
        <StatTile label="Total check-ins" value={totals ? totals.totalCheckIns.toLocaleString() : "…"} />
        <StatTile
          label="Average attendance"
          value={totals ? totals.avgAttendance.toLocaleString() : "…"}
          hint="per service held"
        />
        <StatTile label="Active members" value={totals ? totals.activeMembers.toLocaleString() : "…"} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-1">Attendance by service</h2>
        <p className="text-xs text-muted mb-4">Your {perService.length} most recent services, oldest to newest.</p>
        <MagnitudeBarChart
          data={perService.map((s) => ({ label: formatDate(s.date).replace(/^\w+, /, ""), value: s.count }))}
        />
        {perService.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted">View as table</summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1.5 pr-4 font-medium">Service</th>
                    <th className="py-1.5 pr-4 font-medium">Date</th>
                    <th className="py-1.5 font-medium">Check-ins</th>
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-t [&_tr]:border-border">
                  {perService.map((s) => (
                    <tr key={s.id}>
                      <td className="py-1.5 pr-4 text-foreground">{s.name}</td>
                      <td className="py-1.5 pr-4 text-muted">{formatDate(s.date)}</td>
                      <td className="py-1.5 text-foreground font-medium tabular-nums">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-1">Check-in method</h2>
        <p className="text-xs text-muted mb-4">How members have been checking in, all-time.</p>
        <CategoricalBreakdownChart data={methodBreakdown.map((m) => ({ label: m.label, value: m.count }))} />
      </div>
    </div>
  );
}

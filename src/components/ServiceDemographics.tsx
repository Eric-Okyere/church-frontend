"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatTile } from "@/components/charts/StatTile";
import { MagnitudeBarChart } from "@/components/charts/MagnitudeBarChart";
import { CategoricalBreakdownChart } from "@/components/charts/CategoricalBreakdownChart";

type Breakdown = { label: string; count: number };

type Demographics = {
  total: number;
  members: number;
  children: number;
  visitors: number;
  gender: Breakdown[];
  department: Breakdown[];
  method: Breakdown[];
};

export default function ServiceDemographics({ serviceId }: { serviceId: string }) {
  const [demographics, setDemographics] = useState<Demographics | null>(null);

  const load = useCallback(async () => {
    const data = await api.get<{ demographics: Demographics }>(`/api/services/${serviceId}/attendance`);
    setDemographics(data.demographics);
  }, [serviceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total checked in" value={demographics ? demographics.total.toLocaleString() : "…"} />
        <StatTile label="Members" value={demographics ? demographics.members.toLocaleString() : "…"} />
        <StatTile label="Children" value={demographics ? demographics.children.toLocaleString() : "…"} />
        <StatTile label="Visitors" value={demographics ? demographics.visitors.toLocaleString() : "…"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold text-foreground mb-1">By gender</h2>
          <p className="text-xs text-muted mb-4">Members who checked in — children and visitors have no gender on file.</p>
          <CategoricalBreakdownChart data={demographics?.gender.map((g) => ({ label: g.label, value: g.count })) ?? []} />
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-foreground mb-1">By department</h2>
          <p className="text-xs text-muted mb-4">Members who checked in, by their registered department.</p>
          <MagnitudeBarChart data={demographics?.department.map((d) => ({ label: d.label, value: d.count })) ?? []} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-foreground mb-1">By check-in method</h2>
        <p className="text-xs text-muted mb-4">How everyone at this service checked in.</p>
        <CategoricalBreakdownChart data={demographics?.method.map((m) => ({ label: m.label, value: m.count })) ?? []} />
      </div>
    </div>
  );
}

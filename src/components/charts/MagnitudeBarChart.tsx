"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

// Magnitude comparison across nominal categories (no natural order) — the
// dataviz skill's rule here is sequential color, ONE hue for every bar
// (never a value-ramp / darker-where-bigger on nominal categories).
const SEQUENTIAL_HUE = "#2a78d6";

export type MagnitudeDatum = { label: string; value: number };

export function MagnitudeBarChart({
  data,
  height = 260,
  valueSuffix = "",
}: {
  data: MagnitudeDatum[];
  height?: number;
  valueSuffix?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 4 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
          tick={{ fill: "#52514e", fontSize: 12 }}
          interval={0}
        />
        <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.2) || 1]} />
        <Bar dataKey="value" fill={SEQUENTIAL_HUE} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: string | number | boolean | null | undefined) =>
              v === null || v === undefined ? "" : `${Number(v).toLocaleString()}${valueSuffix}`
            }
            style={{ fill: "#0b0b0b", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

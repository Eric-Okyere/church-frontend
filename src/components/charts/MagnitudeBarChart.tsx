"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

// Magnitude comparison across nominal categories (no natural order) — the
// dataviz skill's rule here is sequential color, ONE hue for every bar
// (never a value-ramp / darker-where-bigger on nominal categories).
const SEQUENTIAL_HUE = "#2a78d6";
// One step darker — the hovered bar "lifts", per the dataviz skill's
// interaction rules (a hovered mark should visibly respond).
const SEQUENTIAL_HUE_HOVER = "#1d5aa3";

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 4 }} barCategoryGap="24%">
        <XAxis
          dataKey="label"
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
          tick={{ fill: "#52514e", fontSize: 12 }}
          interval={0}
        />
        <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.2) || 1]} />
        {/* The cursor rect highlights the whole category band on hover — not
            just the bar's own pixels — so the hit target is bigger than the
            mark, per the dataviz skill. Recharts computes it from the
            category scale automatically, no extra geometry needed. */}
        <Tooltip
          cursor={{ fill: "var(--border)", opacity: 0.45 }}
          content={(props) => (
            <ChartTooltip {...props} color={SEQUENTIAL_HUE} formatValue={(v) => `${v.toLocaleString()}${valueSuffix}`} />
          )}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={i === activeIndex ? SEQUENTIAL_HUE_HOVER : SEQUENTIAL_HUE} />
          ))}
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

"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

// Fixed categorical slot order (validated together — see the dataviz
// skill's palette.md). Never re-ordered by value: a category keeps its
// color even as counts change week to week.
const SLOT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

export type CategoricalDatum = { label: string; value: number };

// One step darker than its own slot color — the hovered bar "lifts", per
// the dataviz skill's interaction rules — computed rather than a second
// hardcoded palette, since each slot has its own hue.
function darken(hex: string, amount = 0.16): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

// Slots 3 (aqua) and 4 (yellow) sit below 3:1 contrast on the light
// surface — the dataviz skill's "relief rule" for that case is mandatory
// visible direct labels, which this chart always renders.
export function CategoricalBreakdownChart({ data, height = 260 }: { data: CategoricalDatum[]; height?: number }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No check-ins yet.</p>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colorForLabel = (label: string) => {
    const i = data.findIndex((d) => d.label === label);
    return SLOT_COLORS[(i < 0 ? 0 : i) % SLOT_COLORS.length];
  };

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
        {/* Same category-wide cursor highlight as MagnitudeBarChart — see
            the comment there. The tooltip also surfaces each slice's share
            of the total, which the direct labels alone don't show. */}
        <Tooltip
          cursor={{ fill: "var(--border)", opacity: 0.45 }}
          content={(props) => (
            <ChartTooltip
              {...props}
              color={colorForLabel}
              formatValue={(v) => `${v.toLocaleString()}${total > 0 ? ` (${Math.round((v / total) * 100)}%)` : ""}`}
            />
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
          {data.map((_, i) => {
            const base = SLOT_COLORS[i % SLOT_COLORS.length];
            return <Cell key={i} fill={i === activeIndex ? darken(base) : base} />;
          })}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: string | number | boolean | null | undefined) =>
              v === null || v === undefined ? "" : Number(v).toLocaleString()
            }
            style={{ fill: "#0b0b0b", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

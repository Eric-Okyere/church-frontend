"use client";

import { Bar, BarChart, Cell, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

// Fixed categorical slot order (validated together — see the dataviz
// skill's palette.md). Never re-ordered by value: a category keeps its
// color even as counts change week to week.
const SLOT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

export type CategoricalDatum = { label: string; value: number };

// Slots 3 (aqua) and 4 (yellow) sit below 3:1 contrast on the light
// surface — the dataviz skill's "relief rule" for that case is mandatory
// visible direct labels, which this chart always renders.
export function CategoricalBreakdownChart({ data, height = 260 }: { data: CategoricalDatum[]; height?: number }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No check-ins yet.</p>;
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
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={SLOT_COLORS[i % SLOT_COLORS.length]} />
          ))}
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

"use client";

import type { TooltipContentProps } from "recharts";

// Shared tooltip content for every bar chart in this app — one hover layer,
// reused by MagnitudeBarChart and CategoricalBreakdownChart so every graph
// in the product behaves the same way under the pointer. Follows the
// dataviz skill's interaction rules: the value leads (strong, high-contrast
// ink) and the category name follows (muted, secondary) — the legend's
// hierarchy inverted, because here the reader already has the category and
// wants the number. The series is keyed with a short stroke of its own
// color rather than a filled box, which is too much ink at tooltip density.
// This is purely an enhancement: every chart that renders this tooltip also
// shows its values as direct labels on the bars themselves, so nothing here
// is ever the ONLY place a number lives.
export type ChartTooltipValueFormatter = (value: number, label: string) => string;

export function ChartTooltip({
  active,
  payload,
  color,
  formatValue,
}: TooltipContentProps & {
  color?: string | ((label: string) => string);
  formatValue?: ChartTooltipValueFormatter;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0];
  const label = String((point.payload as { label?: string } | undefined)?.label ?? "");
  const value = Number(point.value ?? 0);
  const swatch = typeof color === "function" ? color(label) : (color ?? "#2a78d6");
  const text = formatValue ? formatValue(value, label) : value.toLocaleString();

  return (
    <div
      role="tooltip"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.6rem",
        boxShadow: "0 4px 12px rgba(20, 20, 43, 0.14)",
        padding: "0.5rem 0.7rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.8rem",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "14px",
          height: "3px",
          borderRadius: "2px",
          background: swatch,
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{text}</span>
      <span style={{ color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

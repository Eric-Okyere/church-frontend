// Stat-tile contract (see the dataviz skill): label in sentence case with no
// trailing colon, a semibold auto-compact value, and an optional signed
// delta. Used for headline numbers instead of a one-bar chart.
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-semibold text-foreground mt-1">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

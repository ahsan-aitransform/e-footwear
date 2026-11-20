"use client";
import { money } from "@/lib/format";

/** Dependency-free SVG bar chart: one series, labelled axis, accessible summary. */
export function BarChart({ data, height = 160, label }: { data: { label: string; value: number }[]; height?: number; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / Math.max(1, data.length);
  return (
    <figure>
      <svg viewBox={`0 0 100 ${height / 4}`} preserveAspectRatio="none" role="img" aria-label={label} className="h-40 w-full">
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 4 - 4);
          return (
            <g key={i}>
              <title>{`${d.label}: ${money(d.value)}`}</title>
              <rect x={i * w + w * 0.15} y={height / 4 - h} width={w * 0.7} height={Math.max(h, 0.4)} rx={0.8} className="fill-primary-600" />
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "blue" | "green" | "red" }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${tone === "red" ? "text-danger-600" : tone === "green" ? "text-success-600" : "text-ink"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

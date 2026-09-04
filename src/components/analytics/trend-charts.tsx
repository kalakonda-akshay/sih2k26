"use client";

import { useQuery } from "convex/react";
import { ChartColumnBig } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { TimeWindow } from "./time-range";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trend charts, hand-drawn as inline SVG.
 *
 * No charting library: the project had none installed, and four small series
 * do not justify adding one. Each chart is an area under a polyline with an
 * emphasised endpoint, drawn from the bucketed Convex series.
 */
export function TrendCharts({ window }: { window: TimeWindow }) {
  const trends = useQuery(api.analytics.getTrends, { window });

  const charts = [
    {
      key: "incidents",
      title: "Incident frequency",
      values: trends?.incidents.map((b) => b.count) ?? null,
      hex: "oklch(0.727 0.163 55)",
      suffix: "incidents",
    },
    {
      key: "alerts",
      title: "Alert volume",
      values: trends?.alerts.map((b) => b.count) ?? null,
      hex: "oklch(0.648 0.201 22)",
      suffix: "alerts",
    },
    {
      key: "vehicleActivity",
      title: "Vehicle activity",
      values: trends?.vehicleActivity.map((b) => b.count) ?? null,
      hex: "oklch(0.715 0.128 231)",
      suffix: "events",
    },
    {
      key: "riskScore",
      title: "Average risk score",
      // Averages can be null where a bucket had no assessment; carry the
      // previous value forward so the line does not break misleadingly.
      values: trends
        ? carryForward(trends.riskScore.map((b) => b.value))
        : null,
      hex: "oklch(0.815 0.145 88)",
      suffix: "/100",
    },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ChartColumnBig className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Operational Trends</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {window === "24h"
              ? "12 buckets across 24 hours"
              : window === "7d"
                ? "Daily across 7 days"
                : "15 buckets across 30 days"}
          </p>
        </div>
      </header>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {charts.map((chart) => (
          <div key={chart.key} className="bg-card p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium">{chart.title}</span>
              <span className="ml-auto font-mono text-sm tabular">
                {chart.values ? (chart.values.at(-1) ?? 0) : "—"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {chart.suffix}
              </span>
            </div>

            <div className="mt-2">
              {chart.values === null ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <Sparkline values={chart.values} hex={chart.hex} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Replace nulls with the last known value so a gap does not read as zero. */
function carryForward(values: Array<number | null>): number[] {
  let last = 0;
  return values.map((v) => {
    if (v !== null) last = v;
    return last;
  });
}

/**
 * Small area chart.
 *
 * Uses a `viewBox` with `preserveAspectRatio="none"` so it stretches to the
 * container width while keeping stroke width readable via `vector-effect`.
 */
function Sparkline({
  values,
  hex,
  className,
}: {
  values: number[];
  hex: string;
  className?: string;
}) {
  if (values.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-[11px] text-muted-foreground">
        No data in this window.
      </div>
    );
  }

  const width = 100;
  const height = 32;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, i) => {
    const x = i * step;
    // 2px padding top so the peak is not clipped by the stroke.
    const y = height - (value / max) * (height - 3) - 1.5;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const last = points.at(-1)!;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
        role="img"
        aria-label={`Trend: ${values.join(", ")}`}
      >
        {/* Baseline grid */}
        <line
          x1="0"
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke="currentColor"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
          className="text-border"
        />
        <polygon points={area} fill={hex} opacity="0.14" />
        <polyline
          points={line}
          fill="none"
          stroke={hex}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* Emphasised endpoint, positioned in percentage so it tracks the scale */}
      <span
        className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
        style={{
          backgroundColor: hex,
          left: `${(last[0] / width) * 100}%`,
          top: `${(last[1] / height) * 100}%`,
        }}
        aria-hidden
      />
    </div>
  );
}

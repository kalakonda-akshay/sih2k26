"use client";

import { useQuery } from "convex/react";
import { Columns3 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Priority } from "./route-search";
import { ACCESS_TONE, RISK_TONE, riskLevelFromScore } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * Side-by-side route comparison.
 *
 * Every cell is a computed value from the graph search — nothing is a
 * placeholder. Where a factor does not apply it shows a dash rather than a
 * zero, because zero incidents and "not calculated" are different facts.
 */
export function RouteComparison({
  origin,
  destination,
  priority,
}: {
  origin: string;
  destination: string;
  priority: Priority;
}) {
  const result = useQuery(
    api.routeIntelligence.getRouteOptions,
    origin && destination ? { origin, destination, priority } : "skip",
  );

  if (!result || result.status !== "ok" || result.options.length < 2) {
    return null;
  }

  // Hoisted so the row callbacks below close over a narrowed value rather
  // than the union-typed query result.
  const options = result.options;

  const rows: Array<{
    label: string;
    value: (o: (typeof options)[number]) => React.ReactNode;
  }> = [
    { label: "Distance", value: (o) => `${o.totalDistanceKm} km` },
    { label: "Road segments", value: (o) => String(o.segmentCount) },
    {
      label: "Average risk",
      value: (o) => {
        const t = RISK_TONE[riskLevelFromScore(o.averageRiskScore)];
        return <span className={t.text}>{o.averageRiskScore}/100</span>;
      },
    },
    { label: "Peak segment risk", value: (o) => `${o.maxRiskScore}/100` },
    {
      label: "Accessibility",
      value: (o) => {
        const t = ACCESS_TONE[o.worstAccessibility];
        return <span className={t.text}>{t.label}</span>;
      },
    },
    { label: "Restricted segments", value: (o) => String(o.restrictedSegments) },
    { label: "Active incidents", value: (o) => String(o.incidentCount) },
    {
      label: "Critical incidents",
      value: (o) => (
        <span
          className={
            o.criticalIncidentCount > 0
              ? "text-[oklch(0.648_0.201_22)]"
              : undefined
          }
        >
          {o.criticalIncidentCount}
        </span>
      ),
    },
    { label: "Weighted cost", value: (o) => String(o.totalCost) },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Columns3 className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Route Comparison</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Computed values · lower weighted cost wins
          </p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Factor
              </th>
              {options.map((o) => (
                <th
                  key={o.rank}
                  className={cn(
                    "px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
                    o.recommended
                      ? "text-[oklch(0.735_0.155_158)]"
                      : "text-muted-foreground",
                  )}
                >
                  {o.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.label}
                </td>
                {options.map((o) => (
                  <td
                    key={o.rank}
                    className={cn(
                      "px-3 py-2 font-mono text-xs tabular",
                      o.recommended && "bg-[oklch(0.735_0.155_158)]/[0.05]",
                    )}
                  >
                    {row.value(o)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

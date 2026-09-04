"use client";

import { useQuery } from "convex/react";
import { MapPinned } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { TimeWindow } from "./time-range";
import { RISK_TONE, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function healthTone(score: number) {
  if (score >= 80)
    return { hex: "oklch(0.735 0.155 158)", text: "text-[oklch(0.735_0.155_158)]" };
  if (score >= 60)
    return { hex: "oklch(0.815 0.145 88)", text: "text-[oklch(0.815_0.145_88)]" };
  if (score >= 40)
    return { hex: "oklch(0.727 0.163 55)", text: "text-[oklch(0.727_0.163_55)]" };
  return { hex: "oklch(0.648 0.201 22)", text: "text-[oklch(0.648_0.201_22)]" };
}

/**
 * District-level operational intelligence.
 *
 * Districts are the unit authorities actually act on — a state average hides
 * the single block that is cut off. Sorted worst health first, so the row
 * that needs a decision is always at the top.
 */
export function DistrictIntelligence({ window }: { window: TimeWindow }) {
  const districts = useQuery(api.analytics.getDistrictIntelligence, { window });

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MapPinned className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">District Intelligence</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Worst health first · needs attention at the top
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {districts ? `${districts.length} districts` : "…"}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {[
                "District",
                "Health",
                "Risk",
                "Roads open",
                "Blocked",
                "Incidents",
                "Critical alerts",
                "Vehicles",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {districts === undefined &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td colSpan={8} className="px-3 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}

            {districts?.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  No district data yet — load the demo dataset.
                </td>
              </tr>
            )}

            {districts?.map((d) => {
              const tone = healthTone(d.healthScore);
              const riskTone = RISK_TONE[d.riskLevel as RiskLevel];

              return (
                <tr
                  key={d.district}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2.5">
                    <div className="text-xs font-medium">{d.district}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {d.state}
                    </div>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-sm tabular",
                          tone.text,
                        )}
                      >
                        {d.healthScore}
                      </span>
                      <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d.healthScore}%`,
                            backgroundColor: tone.hex,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td
                    className={cn(
                      "px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider",
                      riskTone.text,
                    )}
                  >
                    {riskTone.label}
                    <span className="ml-1 tabular text-muted-foreground">
                      {d.averageRisk}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 font-mono text-xs tabular text-muted-foreground">
                    {d.accessibleRoads}/{d.totalRoads}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-mono text-xs tabular",
                      d.blockedRoads > 0
                        ? "text-[oklch(0.648_0.201_22)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {d.blockedRoads}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular text-muted-foreground">
                    {d.activeIncidents}
                    {d.windowIncidents > 0 && (
                      <span className="ml-1 text-[10px]">
                        ({d.windowIncidents} in window)
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-mono text-xs tabular",
                      d.criticalAlerts > 0
                        ? "text-[oklch(0.648_0.201_22)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {d.criticalAlerts}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular text-muted-foreground">
                    {d.activeVehicles}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

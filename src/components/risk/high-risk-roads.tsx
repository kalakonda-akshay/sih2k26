"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowUpRight, Route as RouteIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  ACCESS_TONE,
  RISK_TONE,
  type AccessibilityStatus,
  type RiskLevel,
} from "@/lib/risk";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Roads currently carrying elevated risk, with the single factor that drove
 * the score and the action the engine recommends.
 *
 * Each row links through to the Live Intelligence Map, where the corridor is
 * drawn in its accessibility colour.
 */
export function HighRiskRoads({ limit = 10 }: { limit?: number }) {
  const roads = useQuery(api.riskEngine.getHighRiskRoads, { limit });

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <RouteIcon className="size-4 text-[oklch(0.727_0.163_55)]" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">High-Risk Roads</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Corridors in the high or critical band
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {roads ? roads.length : "…"}
        </span>
      </header>

      <div className="divide-y divide-border">
        {roads === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}

        {roads?.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No corridor is currently in the high or critical band.
            </p>
          </div>
        )}

        {roads?.map((road) => {
          const riskTone = RISK_TONE[road.riskLevel as RiskLevel];
          const accessTone =
            ACCESS_TONE[road.accessibilityStatus as AccessibilityStatus];

          return (
            <Link
              key={road._id}
              href="/map"
              className="block p-4 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: riskTone.hex }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-sm font-semibold">
                      {road.roadNumber}
                    </span>
                    <span className="truncate text-sm">{road.roadName}</span>
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        accessTone.chip,
                        accessTone.border,
                        accessTone.text,
                      )}
                    >
                      {accessTone.label}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {road.district}, {road.state} · updated{" "}
                    {timeAgo(road.lastUpdated)}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                      Primary factor
                    </span>
                    <span className="text-[11px] text-foreground/85">
                      {road.primaryFactor}
                    </span>
                    {road.primaryFactorWeight > 0 && (
                      <span
                        className={cn(
                          "font-mono text-[10px] tabular",
                          riskTone.text,
                        )}
                      >
                        +{road.primaryFactorWeight}
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {road.recommendedAction}
                  </p>
                </div>

                <div className="flex shrink-0 items-start gap-1.5">
                  <div className="text-right">
                    <div
                      className={cn(
                        "text-lg font-semibold leading-none tabular",
                        riskTone.text,
                      )}
                    >
                      {Math.round(road.riskScore)}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                      /100
                    </div>
                  </div>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

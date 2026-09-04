"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  CircleAlert,
  CircleCheck,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { CARGO_LABEL } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Vehicles whose corridor to destination is cut by a closure.
 *
 * "Disrupted" means the shortest path *ignoring closures* passes through a
 * blocked segment — that is, the natural route is severed. Each row carries
 * the alternative the engine would take, or states plainly that none exists.
 */
export function RouteDisruptions({
  onSelectRoute,
}: {
  onSelectRoute?: (roadIds: string[]) => void;
}) {
  const disruptions = useQuery(api.routeIntelligence.getRouteDisruptions);
  const detect = useMutation(api.routeIntelligence.detectRouteDisruptions);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setOutcome(null);
    try {
      const r = await detect({});
      setOutcome(
        r.raised === 0
          ? `Checked ${r.checked} priority consignment(s) — no new alert needed.`
          : `Raised ${r.raised} route-disruption alert(s) across ${r.checked} priority consignment(s).`,
      );
    } catch (error) {
      setOutcome(
        error instanceof Error ? error.message : "Detection failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <ShieldAlert className="size-4 text-[oklch(0.648_0.201_22)]" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Route Disruptions</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Consignments whose corridor is cut
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-7 gap-1.5 text-xs"
          disabled={busy}
          onClick={run}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CircleAlert className="size-3" />
          )}
          Raise alerts
        </Button>
      </header>

      <div className="divide-y divide-border">
        {disruptions === undefined &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}

        {disruptions?.length === 0 && (
          <div className="px-4 py-10 text-center">
            <CircleCheck className="mx-auto size-5 text-[oklch(0.735_0.155_158)]" />
            <p className="mt-2 text-sm text-muted-foreground">
              No consignment is currently cut off by a closure.
            </p>
          </div>
        )}

        {disruptions?.map((row) => {
          const isPriority =
            row.priority === "critical" || row.priority === "emergency";

          return (
            <article key={row.vehicleId} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">
                  {row.vehicleNumber}
                </span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                    isPriority
                      ? "border-[oklch(0.648_0.201_22)]/40 bg-[oklch(0.648_0.201_22)]/12 text-[oklch(0.648_0.201_22)]"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {row.priority}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CARGO_LABEL[row.cargoType] ?? row.cargoType} → {row.destination}
                </span>
              </div>

              <div className="mt-2 flex items-start gap-2">
                <Ban className="mt-0.5 size-3.5 shrink-0 text-[oklch(0.648_0.201_22)]" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Natural corridor from {row.origin} runs through{" "}
                  <span className="font-mono text-foreground/90">
                    {row.blockedBy.map((b) => b.roadNumber).join(", ")}
                  </span>
                  , currently blocked.
                </p>
              </div>

              {row.alternative ? (
                <button
                  type="button"
                  onClick={() =>
                    onSelectRoute?.(
                      row.alternative!.segments.map((s) => s.roadId),
                    )
                  }
                  className="mt-2.5 w-full rounded-md border border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/8 px-2.5 py-2 text-left transition-colors hover:bg-[oklch(0.735_0.155_158)]/14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[oklch(0.735_0.155_158)]">
                    Alternative available
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/90">
                    {row.alternative.nodes.join(" → ")}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {row.alternative.totalDistanceKm} km ·{" "}
                    {row.alternative.segmentCount} segments · avg risk{" "}
                    {row.alternative.averageRiskScore}/100
                  </p>
                </button>
              ) : (
                <p className="mt-2.5 rounded-md border border-[oklch(0.648_0.201_22)]/35 bg-[oklch(0.648_0.201_22)]/8 px-2.5 py-2 text-xs text-[oklch(0.648_0.201_22)]">
                  No open alternative corridor exists on the monitored network.
                  Consider air-lift or hold until clearance.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {outcome && (
        <p className="border-t border-border bg-background/40 px-4 py-2 text-[11px] text-muted-foreground">
          {outcome}
        </p>
      )}
    </section>
  );
}

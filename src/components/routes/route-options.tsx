"use client";

import { useQuery } from "convex/react";
import {
  Ban,
  CircleCheck,
  Route as RouteIcon,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Priority } from "./route-search";
import { ACCESS_TONE, RISK_TONE, riskLevelFromScore } from "@/lib/risk";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type RouteResult = NonNullable<
  ReturnType<typeof useQuery<typeof api.routeIntelligence.getRouteOptions>>
>;

/**
 * Route options and the reasoning behind the recommendation.
 *
 * The four outcomes are kept distinct because they demand different
 * responses: a route exists · the only path is blocked (severed) · the two
 * places were never connected (data gap) · one of them is not on the network
 * at all. Collapsing these into "no route found" would tell an operator
 * nothing about what to do next.
 */
export function RouteOptions({
  origin,
  destination,
  priority,
  selectedRank,
  onSelect,
}: {
  origin: string;
  destination: string;
  priority: Priority;
  selectedRank: number;
  onSelect: (rank: number, roadIds: string[]) => void;
}) {
  const result = useQuery(
    api.routeIntelligence.getRouteOptions,
    origin && destination ? { origin, destination, priority } : "skip",
  );

  if (!origin || !destination) {
    return (
      <section className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <RouteIcon className="size-6 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-medium">Select an origin and destination</h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          The engine searches the monitored corridor network for open paths,
          weighting distance against corridor risk and accessibility according
          to the delivery priority you choose.
        </p>
      </section>
    );
  }

  if (result === undefined) {
    return (
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </section>
    );
  }

  if (result.status !== "ok") {
    const Icon =
      result.status === "severed"
        ? Ban
        : result.status === "disconnected"
          ? Unlink
          : TriangleAlert;

    const tone =
      result.status === "severed"
        ? "text-[oklch(0.648_0.201_22)] border-[oklch(0.648_0.201_22)]/35 bg-[oklch(0.648_0.201_22)]/8"
        : "text-[oklch(0.815_0.145_88)] border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/8";

    return (
      <section className={cn("rounded-lg border p-5", tone)}>
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {result.status === "severed"
                ? "Corridor severed"
                : result.status === "disconnected"
                  ? "Not connected on this network"
                  : "Cannot route"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {result.message}
            </p>

            {result.status === "severed" && (
              <p className="mt-2 text-xs leading-relaxed opacity-90">
                This is a closure, not a data gap — the corridor exists and
                would be usable once cleared.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Options */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <RouteIcon className="size-4 text-primary" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {result.options.length} route option
              {result.options.length === 1 ? "" : "s"}
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {origin} → {destination} · {priority} priority
            </p>
          </div>
        </header>

        <div className="divide-y divide-border">
          {result.options.map((option) => {
            const tone = RISK_TONE[riskLevelFromScore(option.averageRiskScore)];
            const accessTone = ACCESS_TONE[option.worstAccessibility];
            const selected = selectedRank === option.rank;

            return (
              <button
                key={option.rank}
                type="button"
                onClick={() =>
                  onSelect(
                    option.rank,
                    option.segments.map((s) => s.roadId),
                  )
                }
                aria-pressed={selected}
                className={cn(
                  "relative block w-full p-4 text-left transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  selected ? "bg-muted/50" : "hover:bg-muted/25",
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 w-0.5"
                  style={{
                    backgroundColor: option.recommended
                      ? "oklch(0.735 0.155 158)"
                      : tone.hex,
                    opacity: selected ? 1 : 0.5,
                  }}
                />

                <div className="pl-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        option.recommended
                          ? "border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10 text-[oklch(0.735_0.155_158)]"
                          : "border-border bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {option.label}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-wider",
                        accessTone.text,
                      )}
                    >
                      {accessTone.label}
                    </span>
                    <span className="ml-auto font-mono text-sm tabular">
                      {option.totalDistanceKm} km
                    </span>
                  </div>

                  <p className="mt-1.5 truncate text-sm">
                    {option.nodes.join(" → ")}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <Stat label="Segments" value={String(option.segmentCount)} />
                    <Stat
                      label="Avg risk"
                      value={`${option.averageRiskScore}/100`}
                      className={tone.text}
                    />
                    <Stat
                      label="Peak risk"
                      value={`${option.maxRiskScore}/100`}
                    />
                    <Stat
                      label="Incidents"
                      value={String(option.incidentCount)}
                      className={
                        option.criticalIncidentCount > 0
                          ? "text-[oklch(0.648_0.201_22)]"
                          : undefined
                      }
                    />
                    <Stat
                      label="Restricted"
                      value={String(option.restrictedSegments)}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Explanation */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Why this route</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {result.priorityProfile}
          </p>
        </header>

        <ul className="divide-y divide-border">
          {result.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2.5 px-4 py-2.5">
              {reason.kind === "advantage" ? (
                <CircleCheck className="mt-px size-3.5 shrink-0 text-[oklch(0.735_0.155_158)]" />
              ) : (
                <TriangleAlert className="mt-px size-3.5 shrink-0 text-[oklch(0.815_0.145_88)]" />
              )}
              <span className="text-xs leading-relaxed text-foreground/85">
                {reason.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Segment breakdown of the selected option */}
      {result.options[selectedRank] && (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">
              Segments — {result.options[selectedRank].label}
            </h3>
          </header>
          <div className="divide-y divide-border">
            {result.options[selectedRank].segments.map((segment, i) => {
              const t = ACCESS_TONE[segment.accessibilityStatus];
              return (
                <div
                  key={`${segment.roadId}-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="font-mono text-[10px] tabular text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold">
                        {segment.roadNumber}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {segment.from} → {segment.to}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular text-muted-foreground">
                    {segment.lengthKm} km
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[10px] uppercase tracking-wider",
                      t.text,
                    )}
                  >
                    {humanize(segment.accessibilityStatus)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn("font-mono text-[11px] tabular", className)}>
        {value}
      </span>
    </span>
  );
}

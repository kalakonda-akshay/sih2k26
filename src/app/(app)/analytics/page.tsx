"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  TimeRangeSelector,
  type TimeWindow,
} from "@/components/analytics/time-range";
import { WindowSummary } from "@/components/analytics/window-summary";
import { HealthScore } from "@/components/analytics/health-score";
import { TrendCharts } from "@/components/analytics/trend-charts";
import { DistrictIntelligence } from "@/components/analytics/district-intelligence";
import {
  DecisionInsights,
  Recommendations,
} from "@/components/analytics/decision-insights";
import { RISK_TONE, riskLevelFromScore } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoControls } from "@/components/dashboard/demo-controls";

/**
 * Advanced Analytics & Decision Intelligence.
 *
 * The window selector drives every query on the page, so the whole view moves
 * together. All panels subscribe to Convex, which means a Demo Simulation
 * action — a new incident, an escalated corridor — moves these numbers live.
 */
export default function AnalyticsPage() {
  const [window, setWindow] = useState<TimeWindow>("7d");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            Operational Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Activity, performance and decision intelligence across the region.
          </p>
        </div>
        <div className="ml-auto">
          <TimeRangeSelector value={window} onChange={setWindow} />
        </div>
      </div>

      <WindowSummary window={window} />

      <HealthScore />

      <TrendCharts window={window} />

      <div className="grid gap-4 xl:grid-cols-2">
        <DecisionInsights window={window} />
        <Recommendations window={window} />
      </div>

      <DistrictIntelligence window={window} />

      <div className="grid gap-4 xl:grid-cols-3">
        <StateBreakdown />
        <SevereWeather />
      </div>

      <DemoControls />
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Retained from the earlier analytics view — still the clearest way to    */
/* see how much of each state's network is open.                           */
/* --------------------------------------------------------------------- */

function StateBreakdown() {
  const states = useQuery(api.dashboard.getStateBreakdown);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card xl:col-span-2">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Connectivity by State</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Share of network accessible · restricted · blocked
        </p>
      </header>

      <div className="divide-y divide-border">
        {states === undefined &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}

        {states?.map((state) => {
          const tone = RISK_TONE[riskLevelFromScore(state.avgRiskScore)];
          const pct = (n: number) =>
            state.totalRoads === 0 ? 0 : (n / state.totalRoads) * 100;

          return (
            <div key={state.state} className="p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className="text-sm font-medium">{state.state}</h4>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {state.totalRoads} segments · {state.incidents} active
                  incidents
                </span>
                <span
                  className={cn("ml-auto font-mono text-xs tabular", tone.text)}
                >
                  avg risk {state.avgRiskScore}
                </span>
              </div>

              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full"
                  style={{
                    width: `${pct(state.accessible)}%`,
                    backgroundColor: "oklch(0.735 0.155 158)",
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${pct(state.restricted)}%`,
                    backgroundColor: "oklch(0.727 0.163 55)",
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${pct(state.blocked)}%`,
                    backgroundColor: "oklch(0.648 0.201 22)",
                  }}
                />
              </div>

              <div className="mt-1.5 flex gap-3 font-mono text-[10px] text-muted-foreground">
                <span>{state.accessible} accessible</span>
                <span>{state.restricted} restricted</span>
                <span>{state.blocked} blocked</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SevereWeather() {
  const weather = useQuery(api.weather.getSevereWeatherLocations);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Severe Weather Watch</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Orange and red warnings
        </p>
      </header>

      <div className="divide-y divide-border">
        {weather === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-4 w-40" />
            </div>
          ))}

        {weather?.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No active severe-weather warnings.
          </p>
        )}

        {weather?.map((record) => (
          <div key={record._id} className="p-4">
            <div className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    record.alertLevel === "red"
                      ? "oklch(0.648 0.201 22)"
                      : "oklch(0.727 0.163 55)",
                }}
              />
              <span className="text-sm font-medium">{record.locationName}</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {record.alertLevel}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[10px] tabular text-muted-foreground">
              <span>{Math.round(record.rainfall)} mm/24h</span>
              <span>{Math.round(record.temperature)}°C</span>
              <span>{Math.round(record.humidity)}% RH</span>
              <span>{Math.round(record.windSpeed)} km/h</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

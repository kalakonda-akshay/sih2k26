"use client";

import { useQuery } from "convex/react";
import { Gauge, SlidersHorizontal } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { RISK_TONE, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const FACTOR_LABEL: Record<string, string> = {
  rainfall: "Rainfall intensity",
  incidents: "Nearby confirmed incidents",
  terrain: "Terrain susceptibility",
  roadCondition: "Road condition",
  weather: "Weather severity",
  historical: "Historical disruption",
};

const FACTOR_SOURCE: Record<string, string> = {
  rainfall: "weatherData.rainfall (mm/24h)",
  incidents: "active incidents within the influence radius",
  terrain: "static terrain index (elevation / slope)",
  roadCondition: "confirmed accessibility status",
  weather: "condition, IMD alert level, wind, humidity",
  historical: "count of prior incidents at the location",
};

/**
 * Risk engine configuration.
 *
 * Read directly from the constants the scoring actually uses, rather than a
 * hand-written description that could drift from the code. If someone changes
 * a cap in `riskCalculations.ts`, this panel changes with it.
 *
 * Read-only by design: making weights editable from the UI would mean a score
 * could no longer be reproduced from a known configuration, which is the
 * property that makes the engine auditable in the first place.
 */
export function EngineConfig() {
  const config = useQuery(api.riskEngine.getEngineConfig);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <SlidersHorizontal className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Risk engine configuration</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {config ? config.version : "Loading…"}
          </p>
        </div>
        {config && (
          <span className="ml-auto shrink-0 rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Read-only
          </span>
        )}
      </header>

      {config === undefined && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}

      {config && (
        <>
          {/* Factor weights */}
          <div className="p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Factor weights
              </span>
              <span className="font-mono text-[10px] tabular text-muted-foreground">
                caps sum to {config.capTotal}
              </span>
            </div>

            <ul className="mt-3 flex flex-col gap-2.5">
              {Object.entries(config.factorCaps)
                .sort(([, a], [, b]) => b - a)
                .map(([key, cap]) => (
                  <li key={key}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">
                        {FACTOR_LABEL[key] ?? key}
                      </span>
                      <span className="ml-auto font-mono text-xs tabular text-primary">
                        {cap}
                      </span>
                      <span className="font-mono text-[10px] tabular text-muted-foreground">
                        / {config.capTotal}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(cap / config.capTotal) * 100}%` }}
                      />
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                      {FACTOR_SOURCE[key]}
                    </p>
                  </li>
                ))}
            </ul>

            <p className="mt-3 rounded-md border border-border bg-background/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Because the caps sum to exactly {config.capTotal}, a factor&rsquo;s
              cap <em>is</em> its maximum share of the score. That is what makes
              a contribution bar readable as a percentage.
            </p>
          </div>

          {/* Bands */}
          <div className="border-t border-border p-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Risk bands
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {config.bands.map((band) => {
                const tone = RISK_TONE[band.level as RiskLevel];
                return (
                  <div
                    key={band.level}
                    className={cn(
                      "rounded-md border px-2.5 py-2",
                      tone.chip,
                      tone.border,
                    )}
                  >
                    <div
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-wider",
                        tone.text,
                      )}
                    >
                      {tone.label}
                    </div>
                    <div className="mt-0.5 font-mono text-xs tabular">
                      {band.from}–{band.to}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scalars */}
          <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
            {[
              {
                label: "Monitored locations",
                value: String(config.monitoredLocations),
                icon: Gauge,
              },
              {
                label: "Incident influence radius",
                value: `${config.incidentInfluenceKm} km`,
                icon: Gauge,
              },
              { label: "Engine version", value: config.version, icon: Gauge },
            ].map((stat) => (
              <div key={stat.label} className="bg-card p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-1 truncate font-mono text-sm tabular">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <p className="border-t border-border bg-background/40 px-4 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            A transparent weighted rule engine, not a trained model. Weights are
            read-only so any score stays reproducible from a known
            configuration.
          </p>
        </>
      )}
    </section>
  );
}

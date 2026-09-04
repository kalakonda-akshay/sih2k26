"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Brain, ChevronDown, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { RISK_TONE, type RiskLevel } from "@/lib/risk";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * AI risk intelligence.
 *
 * Everything here is a forecast, and is labelled PREDICTED RISK so it is never
 * mistaken for a confirmed field report. Each prediction exposes its weighted
 * contributing factors — the score is explainable rather than asserted.
 */
export function RiskIntelligence({ limit = 4 }: { limit?: number }) {
  const predictions = useQuery(api.riskPredictions.getLatestPredictions, {
    limit,
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Brain className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">AI Risk Intelligence</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Explainable disruption forecasting
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
          Predicted risk
        </span>
      </header>

      <div className="divide-y divide-border">
        {predictions === undefined &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}

        {predictions?.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No risk predictions available. Run the seed to load demo data.
          </div>
        )}

        {predictions?.map((prediction) => {
          const tone = RISK_TONE[prediction.riskLevel as RiskLevel];
          const isOpen = expanded === prediction._id;
          const topFactors = [...prediction.contributingFactors].sort(
            (a, b) => b.weight - a.weight,
          );

          return (
            <article key={prediction._id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className={cn("size-3.5", tone.text)} />
                    <h4 className="truncate text-sm font-medium">
                      {prediction.predictedIssue}
                    </h4>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {prediction.locationName} · {prediction.district},{" "}
                    {prediction.state}
                  </p>
                </div>

                {/* Score block */}
                <div className="shrink-0 text-right">
                  <div
                    className={cn(
                      "text-2xl font-semibold leading-none tabular",
                      tone.text,
                    )}
                  >
                    {Math.round(prediction.riskScore)}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  <div
                    className={cn(
                      "mt-1 font-mono text-[9px] uppercase tracking-wider",
                      tone.text,
                    )}
                  >
                    {tone.label}
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(prediction.riskScore, 100)}%`,
                    backgroundColor: tone.hex,
                  }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Confidence{" "}
                  <span className="tabular text-foreground/90">
                    {Math.round(prediction.confidence)}%
                  </span>
                </span>
                {prediction.horizonHours && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Horizon{" "}
                    <span className="tabular text-foreground/90">
                      {prediction.horizonHours}h
                    </span>
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {timeAgo(prediction.createdAt)}
                </span>
              </div>

              {/* Contributing factors */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : prediction._id)}
                aria-expanded={isOpen}
                className="mt-3 flex w-full items-center gap-1.5 rounded font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Contributing factors ({topFactors.length})
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-2.5 space-y-1.5">
                  {topFactors.map((factor) => (
                    <div
                      key={factor.factor}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1"
                    >
                      <span className="truncate text-[11px] text-foreground/85">
                        {factor.factor}
                      </span>
                      <span className="font-mono text-[10px] tabular text-muted-foreground">
                        {factor.weight}%
                      </span>
                      <div className="col-span-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full opacity-80"
                          style={{
                            width: `${factor.weight}%`,
                            backgroundColor: tone.hex,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {prediction.modelVersion && (
                    <div className="pt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Model {prediction.modelVersion}
                    </div>
                  )}
                </div>
              )}

              {/* Recommended action */}
              <div className="mt-3 rounded-md border border-border bg-background/60 px-2.5 py-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Recommended action
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                  {prediction.recommendedAction}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

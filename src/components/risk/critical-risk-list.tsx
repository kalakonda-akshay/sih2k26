"use client";

import { useQuery } from "convex/react";
import { ChevronRight, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RISK_TONE, type RiskLevel } from "@/lib/risk";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Current assessments, worst first.
 *
 * Everything here is a forecast. The panel is headed PREDICTED RISK and each
 * card repeats the label, so a prediction is never mistaken for a confirmed
 * incident — those live in the Incident Center and carry a CONFIRMED badge.
 */
export function CriticalRiskList({
  selectedId,
  onSelect,
  limit = 12,
}: {
  selectedId: Id<"riskPredictions"> | null;
  onSelect: (id: Id<"riskPredictions">) => void;
  limit?: number;
}) {
  const assessments = useQuery(api.riskEngine.getCurrentAssessments, { limit });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Risk Predictions</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Select a location to see why
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
          Predicted risk
        </span>
      </header>

      <div className="max-h-[560px] divide-y divide-border overflow-y-auto">
        {assessments === undefined &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}

        {assessments?.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No assessments yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run the risk engine from the Demo Simulation console.
            </p>
          </div>
        )}

        {assessments?.map((prediction) => {
          const tone = RISK_TONE[prediction.riskLevel as RiskLevel];
          const selected = selectedId === prediction._id;

          return (
            <button
              key={prediction._id}
              type="button"
              onClick={() => onSelect(prediction._id)}
              aria-pressed={selected}
              className={cn(
                "relative block w-full p-3.5 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                selected ? "bg-muted/50" : "hover:bg-muted/30",
              )}
            >
              <span
                className="absolute inset-y-0 left-0 w-0.5"
                style={{
                  backgroundColor: tone.hex,
                  opacity: selected ? 1 : 0.5,
                }}
              />

              <div className="flex items-start gap-3 pl-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">
                      {prediction.locationName}
                    </span>
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        tone.chip,
                        tone.border,
                        tone.text,
                      )}
                    >
                      {tone.label}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {prediction.district}, {prediction.state}
                  </p>
                  <p className="mt-1 truncate text-xs text-foreground/80">
                    {prediction.predictedIssue}
                  </p>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.min(prediction.riskScore, 100)}%`,
                        backgroundColor: tone.hex,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Confidence{" "}
                      <span className="tabular text-foreground/85">
                        {Math.round(prediction.confidence)}%
                      </span>
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {timeAgo(prediction.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <div className="text-right">
                    <div
                      className={cn(
                        "text-xl font-semibold leading-none tabular",
                        tone.text,
                      )}
                    >
                      {Math.round(prediction.riskScore)}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                      /100
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 transition-colors",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

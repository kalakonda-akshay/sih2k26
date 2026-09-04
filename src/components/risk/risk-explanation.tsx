"use client";

import { useQuery } from "convex/react";
import { CircleHelp, Info } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RISK_TONE, type RiskLevel } from "@/lib/risk";
import { formatDateTime, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * "Why is this location at risk?"
 *
 * The panel that makes the engine defensible. Every factor shows the points
 * it contributed, the maximum it *could* have contributed, and a sentence
 * explaining the number. The totals reconcile: the six caps sum to 100, so a
 * bar's fill is literally that factor's share of the score.
 */
export function RiskExplanation({
  predictionId,
}: {
  predictionId: Id<"riskPredictions"> | null;
}) {
  const detail = useQuery(
    api.riskEngine.explainPrediction,
    predictionId ? { predictionId } : "skip",
  );

  if (!predictionId) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <CircleHelp className="size-6 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-medium">
          Why is this location at risk?
        </h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Select a prediction to see the full factor breakdown — what the
          engine measured, how much each input contributed, and why it
          recommends what it does.
        </p>
      </section>
    );
  }

  if (detail === undefined) {
    return (
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-2 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </section>
    );
  }

  if (detail === null) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        That prediction is no longer available.
      </section>
    );
  }

  const { prediction, road } = detail;
  const tone = RISK_TONE[prediction.riskLevel as RiskLevel];
  const factors = [...prediction.contributingFactors].sort(
    (a, b) => b.weight - a.weight,
  );
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Why is this location at risk?
          </h3>
          <span className="ml-auto shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
            Predicted risk
          </span>
        </div>
      </header>

      {/* Headline */}
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-base font-semibold">
              {prediction.locationName}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {prediction.district}, {prediction.state}
              {road ? ` · ${road.roadNumber} ${road.roadName}` : ""}
            </p>
            <p className={cn("mt-1.5 text-sm", tone.text)}>
              {prediction.predictedIssue}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <div
              className={cn(
                "text-3xl font-semibold leading-none tabular",
                tone.text,
              )}
            >
              {Math.round(prediction.riskScore)}
              <span className="text-base text-muted-foreground">/100</span>
            </div>
            <div
              className={cn(
                "mt-1 font-mono text-[10px] uppercase tracking-wider",
                tone.text,
              )}
            >
              {tone.label}
            </div>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Confidence" value={`${Math.round(prediction.confidence)}%`} />
          <Stat
            label="Horizon"
            value={prediction.horizonHours ? `${prediction.horizonHours}h` : "—"}
          />
          <Stat
            label="Issue type"
            value={
              prediction.predictedIssueType
                ? humanize(prediction.predictedIssueType.replace(/_risk$/, ""))
                : "—"
            }
          />
          <Stat label="Generated" value={formatDateTime(prediction.createdAt)} />
        </dl>
      </div>

      {/* Factor breakdown */}
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Contributing factors
          </span>
          <span className="font-mono text-[10px] tabular text-muted-foreground">
            {Math.round(totalWeight)} points total
          </span>
        </div>

        <ul className="mt-3 flex flex-col gap-3">
          {factors.map((factor) => {
            const cap = factor.maxWeight ?? 100;
            const share = cap > 0 ? (factor.weight / cap) * 100 : 0;

            return (
              <li key={factor.factor}>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {factor.factor}
                  </span>
                  <span
                    className={cn(
                      "ml-auto font-mono text-xs tabular",
                      tone.text,
                    )}
                  >
                    +{factor.weight}
                  </span>
                  <span className="font-mono text-[10px] tabular text-muted-foreground">
                    / {cap}
                  </span>
                </div>

                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(share, 100)}%`,
                      backgroundColor: tone.hex,
                      opacity: 0.85,
                    }}
                  />
                </div>

                {factor.explanation && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {factor.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {factors.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No factor contributed points — this location scored zero.
          </p>
        )}
      </div>

      {/* Recommended action */}
      <div className="border-t border-border p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Recommended action
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
          {prediction.recommendedAction}
        </p>
      </div>

      {/* Provenance */}
      <div className="border-t border-border bg-background/40 px-4 py-2.5">
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          Score = sum of six capped factors (30 rainfall · 20 incidents · 15
          terrain · 15 road · 12 weather · 8 historical), blended 85/15 with the
          previous score to damp oscillation. Engine{" "}
          <span className="text-foreground/75">
            {prediction.modelVersion ?? detail.engineVersion}
          </span>
          .
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-xs font-medium tabular">{value}</dd>
    </div>
  );
}

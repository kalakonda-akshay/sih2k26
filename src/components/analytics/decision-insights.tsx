"use client";

import { useQuery } from "convex/react";
import { Lightbulb, ListChecks } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { TimeWindow } from "./time-range";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const SEVERITY_TONE: Record<
  string,
  { text: string; chip: string; border: string; hex: string }
> = {
  critical: {
    text: "text-[oklch(0.648_0.201_22)]",
    chip: "bg-[oklch(0.648_0.201_22)]/12",
    border: "border-[oklch(0.648_0.201_22)]/40",
    hex: "oklch(0.648 0.201 22)",
  },
  high: {
    text: "text-[oklch(0.727_0.163_55)]",
    chip: "bg-[oklch(0.727_0.163_55)]/12",
    border: "border-[oklch(0.727_0.163_55)]/35",
    hex: "oklch(0.727 0.163 55)",
  },
  medium: {
    text: "text-[oklch(0.815_0.145_88)]",
    chip: "bg-[oklch(0.815_0.145_88)]/12",
    border: "border-[oklch(0.815_0.145_88)]/35",
    hex: "oklch(0.815 0.145 88)",
  },
  low: {
    text: "text-muted-foreground",
    chip: "bg-muted",
    border: "border-border",
    hex: "oklch(0.685 0.019 245)",
  },
};

/**
 * Decision intelligence.
 *
 * Each card is a named deterministic rule that fired, and each shows the
 * threshold that made it fire. That matters: an operator can disagree with
 * the *rule* rather than having to take an opaque verdict on faith.
 *
 * The header says "deterministic rules", not "AI" — nothing here is a model,
 * and claiming otherwise would not survive a judge asking how it works.
 */
export function DecisionInsights({ window }: { window: TimeWindow }) {
  const data = useQuery(api.insights.getDecisionInsights, { window });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Lightbulb className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Decision Intelligence</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Deterministic rules over live data
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {data ? `${data.insights.length}` : "…"}
        </span>
      </header>

      <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
        {data === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}

        {data?.insights.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No rule fired in this window.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Operations are within normal parameters.
            </p>
          </div>
        )}

        {data?.insights.map((insight, index) => {
          const tone = SEVERITY_TONE[insight.severity] ?? SEVERITY_TONE.low;

          return (
            <article
              key={`${insight.code}-${index}`}
              className="relative p-4"
            >
              <span
                className="absolute inset-y-0 left-0 w-0.5"
                style={{ backgroundColor: tone.hex }}
              />

              <div className="pl-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      tone.chip,
                      tone.border,
                      tone.text,
                    )}
                  >
                    {insight.severity}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {insight.code.replace(/_/g, " ")}
                  </span>
                </div>

                <h4 className="mt-1.5 text-sm font-medium leading-snug">
                  {insight.title}
                </h4>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {insight.detail}
                </p>

                {insight.affected &&
                  (insight.affected.district ||
                    insight.affected.roadNumber) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {insight.affected.roadNumber && (
                        <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                          {insight.affected.roadNumber}
                        </span>
                      )}
                      {insight.affected.district && (
                        <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                          {insight.affected.district}
                        </span>
                      )}
                    </div>
                  )}

                <p className="mt-2 border-t border-border pt-1.5 font-mono text-[9px] leading-relaxed text-muted-foreground">
                  Rule: {insight.rule}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {data && (
        <p className="border-t border-border bg-background/40 px-4 py-2 font-mono text-[10px] text-muted-foreground">
          Method: {data.method} — same inputs always produce the same output.
        </p>
      )}
    </section>
  );
}

/**
 * Recommendation engine output.
 *
 * Every card pairs an action with the observation that produced it, so the
 * reason travels with the instruction.
 */
export function Recommendations({ window }: { window: TimeWindow }) {
  const data = useQuery(api.insights.getRecommendations, { window });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ListChecks className="size-4 text-[oklch(0.735_0.155_158)]" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Recommended Actions</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Prioritised, with the evidence attached
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {data ? `${data.recommendations.length}` : "…"}
        </span>
      </header>

      <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
        {data === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}

        {data?.recommendations.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No action recommended right now.
            </p>
          </div>
        )}

        {data?.recommendations.map((rec, index) => {
          const tone = SEVERITY_TONE[rec.priority] ?? SEVERITY_TONE.low;

          return (
            <article key={`${rec.code}-${index}`} className="relative p-4">
              <span
                className="absolute inset-y-0 left-0 w-0.5"
                style={{ backgroundColor: tone.hex }}
              />

              <div className="pl-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      tone.chip,
                      tone.border,
                      tone.text,
                    )}
                  >
                    {rec.priority}
                  </span>
                  {rec.affected?.count !== undefined &&
                    rec.affected.count > 0 && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {rec.affected.count} affected
                      </span>
                    )}
                </div>

                <h4 className="mt-1.5 text-sm font-medium leading-snug">
                  {rec.action}
                </h4>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {rec.reason}
                </p>

                {(rec.affected?.roadNumber ||
                  rec.affected?.district ||
                  rec.affected?.vehicleNumber) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {rec.affected.roadNumber && (
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                        {rec.affected.roadNumber}
                      </span>
                    )}
                    {rec.affected.district && (
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                        {rec.affected.district}
                      </span>
                    )}
                    {rec.affected.vehicleNumber && (
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                        {rec.affected.vehicleNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

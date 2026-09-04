"use client";

import { useQuery } from "convex/react";
import { HeartPulse } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const BAND_TONE: Record<string, { text: string; hex: string; label: string }> = {
  healthy: {
    text: "text-[oklch(0.735_0.155_158)]",
    hex: "oklch(0.735 0.155 158)",
    label: "Healthy",
  },
  strained: {
    text: "text-[oklch(0.815_0.145_88)]",
    hex: "oklch(0.815 0.145 88)",
    label: "Strained",
  },
  degraded: {
    text: "text-[oklch(0.727_0.163_55)]",
    hex: "oklch(0.727 0.163 55)",
    label: "Degraded",
  },
  critical: {
    text: "text-[oklch(0.648_0.201_22)]",
    hex: "oklch(0.648 0.201 22)",
    label: "Critical",
  },
};

/**
 * NER Logistics Health Score.
 *
 * Deliberately shows the arithmetic: six components, each with the points it
 * earned out of its cap and the counts that produced them. The caps sum to
 * 100, so a bar's fill is that component's actual share of the score. There
 * is no hardcoded constant to disbelieve.
 */
export function HealthScore() {
  const health = useQuery(api.analytics.getOperationalHealth);
  const tone = health ? BAND_TONE[health.band] : null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <HeartPulse className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">NER Logistics Health Score</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Six weighted components · deterministic
          </p>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[auto_1fr] lg:gap-6">
        {/* Headline */}
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:justify-center">
          {health === undefined ? (
            <Skeleton className="h-16 w-28" />
          ) : (
            <>
              <div>
                <div
                  className={cn(
                    "text-5xl font-semibold leading-none tabular",
                    tone?.text,
                  )}
                >
                  {health.score}
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
                <div
                  className={cn(
                    "mt-2 font-mono text-[11px] uppercase tracking-[0.16em]",
                    tone?.text,
                  )}
                >
                  {tone?.label}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Components */}
        <div className="min-w-0">
          {health === undefined && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}

          {health && (
            <ul className="flex flex-col gap-2.5">
              {health.components.map((component) => {
                const share =
                  component.max > 0
                    ? (component.score / component.max) * 100
                    : 0;

                return (
                  <li key={component.key}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">
                        {component.label}
                      </span>
                      <span className="ml-auto font-mono text-xs tabular">
                        {component.score}
                      </span>
                      <span className="font-mono text-[10px] tabular text-muted-foreground">
                        / {component.max}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(share, 100)}%`,
                          // Green when the component is healthy, warm when it
                          // is dragging the score down.
                          backgroundColor:
                            share >= 70
                              ? "oklch(0.735 0.155 158)"
                              : share >= 40
                                ? "oklch(0.815 0.145 88)"
                                : "oklch(0.648 0.201 22)",
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {component.explanation}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="border-t border-border bg-background/40 px-4 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Score = sum of six capped components (25 roads · 20 delivery · 20
        incidents · 15 vehicles · 10 alerts · 10 predicted risk). Higher is
        healthier. Computed from live counts, not a stored value.
      </p>
    </section>
  );
}

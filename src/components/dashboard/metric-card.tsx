"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type MetricTone = "neutral" | "safe" | "moderate" | "high" | "critical";

/**
 * Tone carries meaning, so it lives in the content — the icon chip and the
 * figure itself — rather than as a decorative stripe down the card edge. A
 * coloured rail on every card reads as ornament and flattens the hierarchy;
 * a coloured *number* is the thing an operator is actually scanning for.
 */
const TONE: Record<
  MetricTone,
  { value: string; chipBg: string; chipFg: string; bar: string }
> = {
  neutral: {
    value: "text-foreground",
    chipBg: "bg-muted",
    chipFg: "text-muted-foreground",
    bar: "bg-muted-foreground/40",
  },
  safe: {
    value: "text-[oklch(0.735_0.155_158)]",
    chipBg: "bg-[oklch(0.735_0.155_158)]/12",
    chipFg: "text-[oklch(0.735_0.155_158)]",
    bar: "bg-[oklch(0.735_0.155_158)]",
  },
  moderate: {
    value: "text-[oklch(0.815_0.145_88)]",
    chipBg: "bg-[oklch(0.815_0.145_88)]/12",
    chipFg: "text-[oklch(0.815_0.145_88)]",
    bar: "bg-[oklch(0.815_0.145_88)]",
  },
  high: {
    value: "text-[oklch(0.727_0.163_55)]",
    chipBg: "bg-[oklch(0.727_0.163_55)]/12",
    chipFg: "text-[oklch(0.727_0.163_55)]",
    bar: "bg-[oklch(0.727_0.163_55)]",
  },
  critical: {
    value: "text-[oklch(0.648_0.201_22)]",
    chipBg: "bg-[oklch(0.648_0.201_22)]/14",
    chipFg: "text-[oklch(0.648_0.201_22)]",
    bar: "bg-[oklch(0.648_0.201_22)]",
  },
};

export interface MetricCardProps {
  label: string;
  value: number | undefined;
  icon: ComponentType<{ className?: string }>;
  /** Short qualifier under the value, e.g. "3 delayed · 2 emergency". */
  context?: string;
  tone?: MetricTone;
  /** Denominator for the share bar, when the metric is part of a whole. */
  total?: number;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  context,
  tone = "neutral",
  total,
}: MetricCardProps) {
  const t = TONE[tone];
  const loading = value === undefined;
  const share =
    total && total > 0 && value !== undefined
      ? Math.round((value / total) * 100)
      : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        "transition-colors duration-200 hover:border-border/60 hover:bg-card/80",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            t.chipBg,
          )}
        >
          <Icon className={cn("size-4", t.chipFg)} />
        </span>
        <span className="pt-0.5 font-mono text-[10px] uppercase leading-[1.3] tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <>
            <span
              className={cn(
                "text-[32px] font-semibold leading-none tracking-tight tabular",
                t.value,
              )}
            >
              {value}
            </span>
            {share !== null && (
              <span className="font-mono text-[11px] tabular text-muted-foreground">
                / {total}
              </span>
            )}
          </>
        )}
      </div>

      {/* Share bar sits directly under the figure it divides. */}
      {share !== null && !loading && (
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", t.bar)}
            style={{ width: `${Math.min(share, 100)}%` }}
          />
        </div>
      )}

      {context && (
        <div className="mt-auto text-[11.5px] leading-snug text-muted-foreground">
          {loading ? <Skeleton className="h-3 w-28" /> : context}
        </div>
      )}
    </div>
  );
}

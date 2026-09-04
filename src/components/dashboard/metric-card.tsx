"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type MetricTone = "neutral" | "safe" | "moderate" | "high" | "critical";

const TONE_STYLE: Record<
  MetricTone,
  { value: string; icon: string; rail: string }
> = {
  neutral: {
    value: "text-foreground",
    icon: "text-muted-foreground",
    rail: "bg-border",
  },
  safe: {
    value: "text-[oklch(0.735_0.155_158)]",
    icon: "text-[oklch(0.735_0.155_158)]",
    rail: "bg-[oklch(0.735_0.155_158)]",
  },
  moderate: {
    value: "text-[oklch(0.815_0.145_88)]",
    icon: "text-[oklch(0.815_0.145_88)]",
    rail: "bg-[oklch(0.815_0.145_88)]",
  },
  high: {
    value: "text-[oklch(0.727_0.163_55)]",
    icon: "text-[oklch(0.727_0.163_55)]",
    rail: "bg-[oklch(0.727_0.163_55)]",
  },
  critical: {
    value: "text-[oklch(0.648_0.201_22)]",
    icon: "text-[oklch(0.648_0.201_22)]",
    rail: "bg-[oklch(0.648_0.201_22)]",
  },
};

export interface MetricCardProps {
  label: string;
  value: number | undefined;
  icon: ComponentType<{ className?: string }>;
  /** Short qualifier under the value, e.g. "3 delayed". */
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
  const style = TONE_STYLE[tone];
  const loading = value === undefined;
  const share =
    total && total > 0 && value !== undefined
      ? Math.round((value / total) * 100)
      : null;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80">
      {/* Tone rail */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-px",
          style.rail,
          tone === "neutral" ? "opacity-60" : "opacity-80",
        )}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.13em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("size-4 shrink-0", style.icon)} />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-8 w-14" />
        ) : (
          <span
            className={cn(
              "text-3xl font-semibold leading-none tabular",
              style.value,
            )}
          >
            {value}
          </span>
        )}
        {share !== null && !loading && (
          <span className="font-mono text-[11px] tabular text-muted-foreground">
            / {total}
          </span>
        )}
      </div>

      {context && (
        <div className="mt-2 truncate text-[11px] text-muted-foreground">
          {loading ? <Skeleton className="h-3 w-24" /> : context}
        </div>
      )}

      {share !== null && !loading && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", style.rail)}
            style={{ width: `${Math.min(share, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

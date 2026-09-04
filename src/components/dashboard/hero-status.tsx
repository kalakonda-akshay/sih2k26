"use client";

import { useQuery } from "convex/react";
import { Activity, Radio, ShieldCheck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Compact hero band. Status chips reflect real system state rather than
 * decorative text: the operational chip degrades when blocked roads or
 * critical alerts appear.
 */
export function HeroStatus() {
  const m = useQuery(api.dashboard.getMetrics);

  const degraded = (m?.blockedRoads ?? 0) > 0 || (m?.criticalAlerts ?? 0) > 0;
  const statusLabel = !m
    ? "Connecting"
    : degraded
      ? "Operational — degraded network"
      : "System operational";

  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className="command-grid absolute inset-0 opacity-[0.35]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 0% 0%, oklch(0.715 0.128 231 / 0.10), transparent 55%)",
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 md:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              MDoNER · SIH26002
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            North East Logistics Intelligence
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Real-time accessibility, logistics and disruption intelligence
            across the North Eastern Region.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            icon={ShieldCheck}
            label={statusLabel}
            tone={!m ? "moderate" : degraded ? "high" : "safe"}
          />
          <StatusChip icon={Radio} label="Monitoring 8 states" tone="neutral" />
          <StatusChip
            icon={Activity}
            label={
              m ? `Live · ${formatClock(m.lastUpdated)}` : "Awaiting data"
            }
            tone={m ? "safe" : "moderate"}
            pulse={Boolean(m)}
          />
        </div>
      </div>
    </section>
  );
}

function StatusChip({
  icon: Icon,
  label,
  tone,
  pulse,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "safe" | "moderate" | "high" | "neutral";
  pulse?: boolean;
}) {
  const toneClass = {
    safe: "text-[oklch(0.735_0.155_158)] border-[oklch(0.735_0.155_158)]/30 bg-[oklch(0.735_0.155_158)]/10",
    moderate:
      "text-[oklch(0.815_0.145_88)] border-[oklch(0.815_0.145_88)]/30 bg-[oklch(0.815_0.145_88)]/10",
    high: "text-[oklch(0.727_0.163_55)] border-[oklch(0.727_0.163_55)]/30 bg-[oklch(0.727_0.163_55)]/10",
    neutral: "text-muted-foreground border-border bg-muted/40",
  }[tone];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
        toneClass,
      )}
    >
      {pulse ? (
        <span className="live-dot inline-block size-1.5 shrink-0 rounded-full bg-current" />
      ) : (
        <Icon className="size-3.5 shrink-0" />
      )}
      <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
        {label}
      </span>
    </div>
  );
}

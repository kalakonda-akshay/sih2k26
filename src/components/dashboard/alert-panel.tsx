"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ALERT_TYPE_LABEL, SEVERITY_TONE, type Severity } from "@/lib/risk";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Critical alert centre.
 *
 * The list is sorted server-side (critical → high → medium → low, newest
 * first inside a band) and acknowledging writes through a Convex mutation, so
 * every connected client sees the change without a refetch.
 */
export function AlertPanel({ limit = 6 }: { limit?: number }) {
  const alerts = useQuery(api.alerts.listActiveAlerts, { limit });
  const acknowledge = useMutation(api.alerts.acknowledgeAlert);
  const currentUser = useQuery(api.users.getCurrentUser);
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAcknowledge = async (alertId: Id<"alerts">) => {
    setPending(alertId);
    try {
      await acknowledge({
        alertId,
        acknowledgedBy: currentUser?._id,
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ShieldAlert className="size-4 text-[oklch(0.648_0.201_22)]" />
        <h3 className="text-sm font-semibold">Critical Alert Center</h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {alerts ? `${alerts.length} active` : "…"}
        </span>
      </header>

      <div className="divide-y divide-border">
        {alerts === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}

        {alerts?.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No active alerts across the region.
            </p>
          </div>
        )}

        {alerts?.map((alert) => {
          const tone = SEVERITY_TONE[alert.severity as Severity];
          const isOpen = expanded === alert._id;

          return (
            <article key={alert._id} className="relative">
              {/* Severity rail */}
              <span
                className="absolute inset-y-0 left-0 w-0.5"
                style={{ backgroundColor: tone.hex }}
              />

              <div className="p-4 pl-5">
                <div className="flex items-start gap-2">
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
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {ALERT_TYPE_LABEL[alert.alertType] ?? alert.alertType}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                    {timeAgo(alert.createdAt)}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-medium leading-snug">
                  {alert.title}
                </h4>

                <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {alert.locationName ?? "Region-wide"}
                  {alert.district ? ` · ${alert.district}` : ""}
                </div>

                {isOpen && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {alert.message}
                  </p>
                )}

                <div className="mt-2.5 rounded-md border border-border bg-background/60 px-2.5 py-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Recommended action
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-xs leading-relaxed text-foreground/90",
                      !isOpen && "line-clamp-2",
                    )}
                  >
                    {alert.recommendedAction}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    onClick={() => handleAcknowledge(alert._id)}
                    disabled={pending === alert._id}
                  >
                    {pending === alert._id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => setExpanded(isOpen ? null : alert._id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? "Less" : "Details"}
                    <ChevronRight
                      className={cn(
                        "size-3 transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

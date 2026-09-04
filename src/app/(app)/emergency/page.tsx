"use client";

import { useQuery } from "convex/react";
import {
  Ban,
  ListChecks,
  MapPinned,
  ShieldCheck,
  Siren,
  Truck,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { CARGO_LABEL, RISK_TONE, riskLevelFromScore } from "@/lib/risk";
import { humanize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoControls } from "@/components/dashboard/demo-controls";

const SEVERITY_TONE: Record<string, { text: string; hex: string; label: string }> =
  {
    none: {
      text: "text-[oklch(0.735_0.155_158)]",
      hex: "oklch(0.735 0.155 158)",
      label: "Normal",
    },
    elevated: {
      text: "text-[oklch(0.815_0.145_88)]",
      hex: "oklch(0.815 0.145 88)",
      label: "Elevated",
    },
    major: {
      text: "text-[oklch(0.727_0.163_55)]",
      hex: "oklch(0.727 0.163 55)",
      label: "Major",
    },
    severe: {
      text: "text-[oklch(0.648_0.201_22)]",
      hex: "oklch(0.648 0.201 22)",
      label: "Severe",
    },
  };

/**
 * Emergency Mode.
 *
 * The posture is **derived, not toggled**: the region is in an emergency
 * state when a corridor is closed, a critical incident is open, or an
 * emergency vehicle is deployed. Severity scales with how many of those
 * signals are firing at once. Deriving it from real conditions means it
 * cannot be left switched on after the situation has cleared, which is the
 * usual failure of a manual emergency flag.
 */
export default function EmergencyPage() {
  const briefing = useQuery(api.briefing.getEmergencyBriefing);
  const tone = briefing ? SEVERITY_TONE[briefing.severity] : null;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Status band */}
      <section
        className={cn(
          "relative overflow-hidden rounded-lg border p-5",
          briefing?.active
            ? "border-[oklch(0.648_0.201_22)]/35 bg-[oklch(0.648_0.201_22)]/8"
            : "border-border bg-card",
        )}
      >
        <div className="flex flex-wrap items-start gap-3">
          {briefing?.active ? (
            <Siren className="mt-0.5 size-5 shrink-0 text-[oklch(0.648_0.201_22)]" />
          ) : (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[oklch(0.735_0.155_158)]" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                Emergency Logistics Mode
              </h2>
              {briefing && (
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                    tone?.text,
                  )}
                  style={{ borderColor: `${tone?.hex}59` }}
                >
                  {tone?.label}
                </span>
              )}
            </div>

            {briefing === undefined ? (
              <Skeleton className="mt-2 h-4 w-96" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {briefing.summary}
              </p>
            )}

            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Status derived from live conditions — not a manual switch
            </p>
          </div>
        </div>
      </section>

      {/* Recommended actions */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ListChecks className="size-4 text-primary" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Recommended Response</h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Proposed actions · require human approval
            </p>
          </div>
        </header>

        <ul className="divide-y divide-border">
          {briefing === undefined &&
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="p-4">
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))}

          {briefing?.recommendedActions.map((action, i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-foreground/90">
                {action}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Blocked corridors */}
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Ban className="size-4 text-[oklch(0.648_0.201_22)]" />
            <h3 className="text-sm font-semibold">Closed Corridors</h3>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {briefing ? briefing.blockedRoads.length : "…"}
            </span>
          </header>

          <div className="divide-y divide-border">
            {briefing?.blockedRoads.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No corridor is closed to traffic.
              </p>
            )}

            {briefing?.blockedRoads.map((road) => {
              const t = RISK_TONE[riskLevelFromScore(road.riskScore)];
              return (
                <div key={road._id} className="flex items-start gap-3 p-4">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {road.roadNumber}
                      </span>
                      <span className="truncate text-sm">{road.roadName}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {road.district}
                    </div>
                  </div>
                  <span className={cn("font-mono text-xs tabular", t.text)}>
                    {Math.round(road.riskScore)}/100
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Critical incidents */}
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Siren className="size-4 text-[oklch(0.648_0.201_22)]" />
            <h3 className="text-sm font-semibold">Critical Incidents</h3>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {briefing ? briefing.criticalIncidents.length : "…"}
            </span>
          </header>

          <div className="divide-y divide-border">
            {briefing?.criticalIncidents.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No incident is at critical severity.
              </p>
            )}

            {briefing?.criticalIncidents.map((incident) => (
              <div key={incident._id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {humanize(incident.type)}
                  </span>
                  {incident.verified ? (
                    <span className="rounded border border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[oklch(0.735_0.155_158)]">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Unverified
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {incident.locationName}, {incident.district} ·{" "}
                  {timeAgo(incident.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Resources */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Truck className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Response Resources</h3>
        </header>

        <div className="grid gap-px bg-border sm:grid-cols-4">
          {[
            {
              label: "Emergency vehicles",
              value: briefing?.resources.emergencyVehicles.length,
            },
            {
              label: "Available vehicles",
              value: briefing?.resources.availableVehicles,
            },
            {
              label: "Priority loads",
              value: briefing?.resources.priorityLoads,
            },
            {
              label: "Priority delayed",
              value: briefing?.resources.delayedPriorityLoads,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular">
                {stat.value ?? "—"}
              </div>
            </div>
          ))}
        </div>

        {briefing && briefing.resources.emergencyVehicles.length > 0 && (
          <div className="divide-y divide-border border-t border-border">
            {briefing.resources.emergencyVehicles.map((vehicle) => (
              <div key={vehicle._id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {vehicle.vehicleNumber}
                  </span>
                  <span className="rounded border border-[oklch(0.648_0.201_22)]/40 bg-[oklch(0.648_0.201_22)]/12 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[oklch(0.648_0.201_22)]">
                    Emergency
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {CARGO_LABEL[vehicle.cargoType] ?? vehicle.cargoType} →{" "}
                  {vehicle.destination} · {vehicle.driverName}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Affected districts */}
      {briefing && briefing.affectedDistricts.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <MapPinned className="size-4 text-[oklch(0.727_0.163_55)]" />
            <h3 className="text-sm font-semibold">Affected Districts</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {briefing.affectedDistricts.map((district) => (
              <span
                key={district}
                className="rounded border border-[oklch(0.727_0.163_55)]/35 bg-[oklch(0.727_0.163_55)]/10 px-2 py-1 text-xs text-[oklch(0.727_0.163_55)]"
              >
                {district}
              </span>
            ))}
          </div>
        </section>
      )}

      <DemoControls />
    </div>
  );
}

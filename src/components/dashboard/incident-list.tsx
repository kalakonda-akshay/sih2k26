"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, BadgeCheck, TriangleAlert } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { INCIDENT_LABEL, SEVERITY_TONE, type Severity } from "@/lib/risk";
import { humanize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recent active incidents — confirmed field observations, as distinct from
 * the model forecasts shown in the AI risk panel.
 */
export function IncidentList({ limit = 6 }: { limit?: number }) {
  const incidents = useQuery(api.incidents.listActiveIncidents, { limit });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <TriangleAlert className="size-4 text-[oklch(0.727_0.163_55)]" />
        <h3 className="text-sm font-semibold">Recent Incidents</h3>
        <span className="ml-auto rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Confirmed
        </span>
      </header>

      <div className="divide-y divide-border">
        {incidents === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          ))}

        {incidents?.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No active incidents reported.
          </div>
        )}

        {incidents?.map((incident) => {
          const tone = SEVERITY_TONE[incident.severity as Severity];

          return (
            <Link
              key={incident._id}
              href={`/incidents?id=${incident._id}`}
              className="block p-3.5 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tone.hex }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">
                      {INCIDENT_LABEL[incident.incidentType] ??
                        humanize(incident.incidentType)}
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
                    {incident.verified && (
                      <BadgeCheck
                        className="size-3.5 text-[oklch(0.735_0.155_158)]"
                        aria-label="Verified"
                      />
                    )}
                  </div>

                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {incident.locationName} · {incident.district},{" "}
                    {incident.state}
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {humanize(incident.status)}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {timeAgo(incident.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-border p-3">
        {/*
          Navigation, not an action — render a real anchor styled with
          buttonVariants rather than a Base UI Button wrapping a Link.
        */}
        <Link
          href="/incidents"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full text-xs",
          )}
        >
          Open incident centre
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

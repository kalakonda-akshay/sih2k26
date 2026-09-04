"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  BellRing,
  ClipboardList,
  FilePlus2,
  Siren,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { IncidentReportForm } from "@/components/field/incident-report-form";
import { useFieldDraft } from "@/components/field/use-field-draft";
import { INCIDENT_LABEL, SEVERITY_TONE, type Severity } from "@/lib/risk";
import { humanize, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { InstallApp } from "@/components/pwa/install-app";

type Tab = "report" | "tasks" | "alerts";

/**
 * Field Operations.
 *
 * Deliberately outside the command-centre shell: no sidebar, no dense tables,
 * one column, large touch targets. A field officer on a phone in rain needs a
 * different interface from an operator at a desk, not a squeezed copy of one.
 */
export default function FieldPage() {
  const [tab, setTab] = useState<Tab>("report");
  const { online } = useFieldDraft();
  const currentUser = useQuery(api.users.getCurrentUser);
  const tasks = useQuery(api.incidents.getFieldTasks, {
    district: currentUser?.district,
    limit: 15,
  });
  const alerts = useQuery(api.alerts.getCriticalAlerts, { limit: 10 });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Siren className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">
              NER-Vision Field Ops
            </h1>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {currentUser?.district
                ? `${currentUser.district} · ${currentUser.name}`
                : "Field operations"}
            </p>
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded border px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider",
              online
                ? "border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10 text-[oklch(0.735_0.155_158)]"
                : "border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10 text-[oklch(0.815_0.145_88)]",
            )}
          >
            {online ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      {/*
        Install control. Renders only when the browser can actually install —
        so field staff on Android see a real button, iOS users get the manual
        Share instruction, and an already-installed app shows neither.
      */}
      <div className="px-4 pt-4">
        <InstallApp className="w-full justify-center" />
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 pb-0">
        <button
          type="button"
          onClick={() => setTab("report")}
          className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-[oklch(0.648_0.201_22)]/40 bg-[oklch(0.648_0.201_22)]/10 text-[oklch(0.648_0.201_22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <FilePlus2 className="size-5" />
          <span className="text-xs font-medium">Report emergency</span>
        </button>
        <Link
          href="/emergency"
          className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Siren className="size-5" />
          <span className="text-xs font-medium">Emergency status</span>
        </Link>
      </div>

      <nav className="flex gap-1 p-4 pb-2" aria-label="Field sections">
        {(
          [
            ["report", "Report", FilePlus2],
            ["tasks", "Tasks", ClipboardList],
            ["alerts", "Alerts", BellRing],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tab === value
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <main className="flex-1 space-y-4 p-4 pt-2">
        {tab === "report" && <IncidentReportForm />}

        {tab === "tasks" && (
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Open incidents</h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {currentUser?.district
                  ? `${currentUser.district} first`
                  : "Region-wide"}
              </p>
            </header>

            <div className="divide-y divide-border">
              {tasks === undefined &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}

              {tasks?.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No open incidents.
                </p>
              )}

              {tasks?.map((task) => {
                const tone = SEVERITY_TONE[task.severity as Severity];
                return (
                  <div key={task._id} className="flex items-start gap-3 p-4">
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tone.hex }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {INCIDENT_LABEL[task.incidentType] ??
                            humanize(task.incidentType)}
                        </span>
                        {task.isAssignedDistrict && (
                          <span className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                            Your district
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {task.locationName}, {task.district} ·{" "}
                        {humanize(task.status)} · {timeAgo(task.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[9px] uppercase tracking-wider",
                        tone.text,
                      )}
                    >
                      {tone.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "alerts" && (
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Critical alerts</h2>
            </header>

            <div className="divide-y divide-border">
              {alerts === undefined &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}

              {alerts?.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No critical alerts.
                </p>
              )}

              {alerts?.map((alert) => (
                <article key={alert._id} className="p-4">
                  <h3 className="text-sm font-medium leading-snug">
                    {alert.title}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {alert.locationName ?? "Region"} ·{" "}
                    {timeAgo(alert.createdAt)}
                  </p>
                  <p className="mt-2 rounded-md border border-border bg-background/60 px-2.5 py-2 text-xs leading-relaxed text-foreground/90">
                    {alert.recommendedAction}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border px-4 py-3">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Open the full command centre
        </Link>
      </footer>
    </div>
  );
}

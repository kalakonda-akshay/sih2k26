"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Database,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  CloudRain,
  Brain,
  TrendingUp,
  TriangleAlert,
  Route as RouteIcon,
  Wand2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TICK_MS = 2500;

type Outcome = { kind: "success" | "error"; message: string };

/**
 * Demo simulation console for the SIH presentation.
 *
 * Every control calls a real Convex mutation that writes to the database. The
 * dashboard then updates because its reactive queries re-run — nothing here
 * animates local state. Opening the dashboard in a second window during the
 * demo makes that point directly.
 *
 * Readiness gating: `seed.seedStatus` reports whether the rows each mutation
 * depends on actually exist (a field officer for `triggerIncident`, the NH-6
 * corridor for `escalateRisk`). The simulation controls stay disabled until
 * they do, so the console can no longer fire a mutation that is guaranteed to
 * throw against an empty database.
 */
export function DemoControls() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const status = useQuery(api.seed.seedStatus);
  const tickVehicles = useMutation(api.demo.tickVehicles);
  const escalateRisk = useMutation(api.demo.escalateRisk);
  const triggerIncident = useMutation(api.demo.triggerIncident);
  const resetScenario = useMutation(api.demo.resetScenario);
  const simulateRainfall = useMutation(api.demo.simulateRainfall);
  const assessAllLocations = useMutation(api.riskEngine.assessAllLocations);
  const detectRouteDisruptions = useMutation(
    api.routeIntelligence.detectRouteDisruptions,
  );
  const seedDemoData = useMutation(api.seed.seedDemoData);

  const loadingStatus = status === undefined;
  const ready = status?.ready ?? false;
  const seeded = status?.seededAt !== null && status?.seededAt !== undefined;

  // Movement loop, held in a ref so re-renders never stack intervals.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * The loop is only ever active when the operator asked for it *and* the
   * database can serve it. Deriving this rather than resetting `running` from
   * an effect means losing readiness mid-run simply stops the interval, with
   * no cascading re-render.
   */
  const simulationActive = running && ready;

  useEffect(() => {
    if (!simulationActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      void tickVehicles({}).catch((error: unknown) => {
        setRunning(false);
        setOutcome({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Vehicle movement stopped unexpectedly.",
        });
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simulationActive, tickVehicles]);

  const run = useCallback(async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setOutcome(null);
    try {
      setOutcome({ kind: "success", message: await fn() });
    } catch (error) {
      setOutcome({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The mutation failed. Check the Convex logs.",
      });
    } finally {
      setBusy(null);
    }
  }, []);

  const actionsDisabled = !ready || busy !== null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(21rem,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-black/50">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <Wand2 className="size-4 text-primary" />
          <span className="text-sm font-medium">Demo Simulation</span>
          {simulationActive && (
            <span className="live-dot ml-1 inline-block size-1.5 rounded-full bg-[oklch(0.735_0.155_158)] text-[oklch(0.735_0.155_158)]" />
          )}
          {!loadingStatus && !ready && (
            <span className="ml-1 rounded border border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[oklch(0.815_0.145_88)]">
              No data
            </span>
          )}
          <ChevronDown
            className={cn(
              "ml-auto size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="border-t border-border p-3.5">
            {/* Step 0 — dataset. Always available, never hidden. */}
            <div
              className={cn(
                "mb-3 rounded-md border p-2.5",
                ready
                  ? "border-border bg-background/60"
                  : "border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Step 0 · Dataset
                </span>
                <span
                  className={cn(
                    "ml-auto font-mono text-[9px] uppercase tracking-wider",
                    loadingStatus
                      ? "text-muted-foreground"
                      : ready
                        ? "text-[oklch(0.735_0.155_158)]"
                        : "text-[oklch(0.815_0.145_88)]",
                  )}
                >
                  {loadingStatus ? "checking…" : ready ? "ready" : "not ready"}
                </span>
              </div>

              {!loadingStatus && !ready && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-[oklch(0.815_0.145_88)]">
                  {seeded
                    ? "Seed record exists but required rows are missing. Loading will repair the dataset."
                    : "Database is empty. Load the demo dataset before running the simulation."}
                </p>
              )}

              {status?.counts && ready && (
                <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {status.counts.vehicles} vehicles · {status.counts.roads}{" "}
                  roads · {status.counts.incidents} incidents ·{" "}
                  {status.counts.alerts} alerts
                </p>
              )}

              <Button
                size="sm"
                variant={ready ? "ghost" : "outline"}
                className="mt-2 h-7 w-full justify-start gap-1.5 text-xs"
                disabled={busy === "seed" || loadingStatus}
                onClick={() =>
                  run("seed", async () => {
                    const result = await seedDemoData({});
                    return result.status === "seeded"
                      ? `Seeded ${result.counts.vehicles} vehicles, ${result.counts.roads} roads, ${result.counts.incidents} incidents, ${result.counts.alerts} alerts.`
                      : "Demo data already present — nothing duplicated.";
                  })
                }
              >
                {busy === "seed" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Database className="size-3" />
                )}
                {ready ? "Reload demo data" : "Load demo data"}
              </Button>
            </div>

            <div className="grid gap-2">
              <Button
                size="sm"
                variant={simulationActive ? "secondary" : "outline"}
                className="h-8 justify-start gap-2 text-xs"
                disabled={!ready || busy !== null}
                onClick={() => setRunning((r) => !r)}
              >
                {simulationActive ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {simulationActive
                  ? "Pause vehicle movement"
                  : "Start vehicle movement"}
                <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                  Step 1
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-2 text-xs"
                disabled={actionsDisabled}
                onClick={() =>
                  run("rain", async () => {
                    const r = await simulateRainfall({});
                    const moved =
                      r.previousScore !== null
                        ? `${r.previousScore} → ${r.nextScore}`
                        : `${r.nextScore}`;
                    return `${r.locationName}: ${r.rainfallMm}mm (${r.alertLevel}). Risk ${moved} (${r.nextLevel}), confidence ${r.confidence}%.${r.alertRaised ? " Alert raised." : ""}`;
                  })
                }
              >
                {busy === "rain" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CloudRain className="size-3.5 text-[oklch(0.715_0.128_231)]" />
                )}
                Heavy rainfall at Nongpoh
                <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                  Step 2
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-2 text-xs"
                disabled={actionsDisabled}
                onClick={() =>
                  run("assess", async () => {
                    const r = await assessAllLocations({});
                    return `Assessed ${r.assessed} locations — ${r.critical} critical, ${r.high} high. ${r.statusChanges} road status change(s), ${r.alertsRaised} alert(s).`;
                  })
                }
              >
                {busy === "assess" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Brain className="size-3.5 text-primary" />
                )}
                Run full risk assessment
                <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                  Step 3
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-2 text-xs"
                disabled={actionsDisabled || !status?.canEscalateRisk}
                onClick={() =>
                  run("risk", async () => {
                    const r = await escalateRisk({});
                    return `${r.roadNumber}: ${Math.round(r.previousScore)} → ${Math.round(r.nextScore)} (${r.previousLevel} → ${r.nextLevel}).`;
                  })
                }
              >
                {busy === "risk" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <TrendingUp className="size-3.5 text-[oklch(0.815_0.145_88)]" />
                )}
                Escalate risk on NH-6
                <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                  Step 4
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-2 text-xs"
                disabled={actionsDisabled || !status?.canTriggerIncident}
                onClick={() =>
                  run("incident", async () => {
                    const r = await triggerIncident({});
                    return `${r.roadNumber} blocked at ${r.locationName}. ${r.vehiclesAffected} vehicle(s) halted, ${r.routesInvalidated} route(s) re-planned.`;
                  })
                }
              >
                {busy === "incident" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <TriangleAlert className="size-3.5 text-[oklch(0.648_0.201_22)]" />
                )}
                Trigger landslide incident
                <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                  Step 5
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 justify-start gap-2 text-xs"
                disabled={actionsDisabled}
                onClick={() =>
                  run("routes", async () => {
                    const r = await detectRouteDisruptions({});
                    return r.raised === 0
                      ? `Checked ${r.checked} priority consignment(s) — no new route alert needed.`
                      : `Raised ${r.raised} route-disruption alert(s) with alternative corridors.`;
                  })
                }
              >
                {busy === "routes" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RouteIcon className="size-3.5 text-[oklch(0.735_0.155_158)]" />
                )}
                Detect route disruptions
                <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                  Step 6
                </span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 justify-start gap-2 text-xs text-muted-foreground"
                disabled={actionsDisabled}
                onClick={() =>
                  run("reset", async () => {
                    const r = await resetScenario({});
                    return `Reset — removed ${r.removedIncidents} incident(s), ${r.removedAlerts} alert(s).`;
                  })
                }
              >
                {busy === "reset" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Reset scenario
              </Button>
            </div>

            {outcome && (
              <div
                role="status"
                aria-live="polite"
                className={cn(
                  "mt-3 flex items-start gap-2 rounded-md border px-2.5 py-2",
                  outcome.kind === "success"
                    ? "border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10"
                    : "border-[oklch(0.648_0.201_22)]/40 bg-[oklch(0.648_0.201_22)]/10",
                )}
              >
                {outcome.kind === "success" ? (
                  <CircleCheck className="mt-px size-3.5 shrink-0 text-[oklch(0.735_0.155_158)]" />
                ) : (
                  <CircleAlert className="mt-px size-3.5 shrink-0 text-[oklch(0.648_0.201_22)]" />
                )}
                <p
                  className={cn(
                    "text-[11px] leading-relaxed",
                    outcome.kind === "success"
                      ? "text-[oklch(0.735_0.155_158)]"
                      : "text-[oklch(0.648_0.201_22)]",
                  )}
                >
                  {outcome.message}
                </p>
              </div>
            )}

            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              All actions write to Convex. Open this dashboard in a second
              window to watch both update together.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

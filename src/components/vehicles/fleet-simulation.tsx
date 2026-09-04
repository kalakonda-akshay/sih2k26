"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CircleAlert,
  CircleCheck,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  Timer,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TICK_MS = 2500;

type Outcome = { kind: "success" | "error"; message: string };

/**
 * GPS simulation console for the fleet.
 *
 * Each tick calls `demo.tickVehicles`, a real Convex mutation that advances
 * every moving vehicle along the line to its destination and writes the new
 * position. The map and tables update because their queries re-run — no
 * marker is animated client-side, and closing this page does not rewind
 * anything, because the movement was persisted.
 */
export function FleetSimulation() {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const status = useQuery(api.seed.seedStatus);
  const tickVehicles = useMutation(api.demo.tickVehicles);
  const resetPositions = useMutation(api.demo.resetVehiclePositions);
  const detectDelays = useMutation(api.fleet.detectDeliveryDelays);

  const ready = status?.ready ?? false;
  const simulationActive = running && ready;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            error instanceof Error ? error.message : "Simulation stopped.",
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
          error instanceof Error ? error.message : "The mutation failed.",
      });
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Satellite className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">GPS Simulation</h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {simulationActive
                ? `Live · ${TICK_MS / 1000}s tick`
                : ready
                  ? "Stopped"
                  : "Load demo data first"}
            </p>
          </div>
          {simulationActive && (
            <span className="live-dot ml-1 inline-block size-1.5 rounded-full bg-[oklch(0.735_0.155_158)] text-[oklch(0.735_0.155_158)]" />
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={simulationActive ? "secondary" : "outline"}
            className="h-7 gap-1.5 text-xs"
            disabled={!ready || busy !== null}
            onClick={() => setRunning((r) => !r)}
          >
            {simulationActive ? (
              <Pause className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
            {simulationActive ? "Pause" : "Start"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            disabled={!ready || busy !== null}
            onClick={() => {
              setRunning(false);
              void run("reset", async () => {
                const r = await resetPositions({});
                return `${r.moved} vehicle(s) returned to their consignment origin.`;
              });
            }}
          >
            {busy === "reset" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RotateCcw className="size-3" />
            )}
            Reset
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            disabled={!ready || busy !== null}
            onClick={() =>
              run("delays", async () => {
                const r = await detectDelays({});
                return r.flagged === 0 && r.alertsRaised === 0
                  ? `Checked ${r.checked} consignments — none newly delayed.`
                  : `Flagged ${r.flagged} delayed, raised ${r.alertsRaised} alert(s) across ${r.checked} consignments.`;
              })
            }
          >
            {busy === "delays" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Timer className="size-3" />
            )}
            Detect delays
          </Button>
        </div>
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
    </section>
  );
}

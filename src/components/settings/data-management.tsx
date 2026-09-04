"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CircleAlert,
  CircleCheck,
  Database,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Outcome = { kind: "success" | "error"; message: string };

/**
 * Demo dataset controls.
 *
 * Every action here calls the same mutations the demo console uses, so the
 * two can never disagree about the state of the database.
 *
 * `clearAll` is genuinely destructive, so it is placed apart from the others,
 * requires a second deliberate click, and states exactly what it removes. It
 * is not hidden behind a tooltip or made to look like the safe actions.
 */
export function DataManagement() {
  const status = useQuery(api.seed.seedStatus);
  const seed = useMutation(api.seed.seedDemoData);
  const reset = useMutation(api.demo.resetScenario);
  const clearAll = useMutation(api.seed.clearAll);
  const assess = useMutation(api.riskEngine.assessAllLocations);

  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [armed, setArmed] = useState(false);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setOutcome(null);
    try {
      setOutcome({ kind: "success", message: await fn() });
    } catch (error) {
      setOutcome({
        kind: "error",
        message:
          error instanceof Error ? error.message : "The action failed.",
      });
    } finally {
      setBusy(null);
      setArmed(false);
    }
  };

  const ready = status?.ready ?? false;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Database className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Demo dataset</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {status === undefined
              ? "Checking…"
              : ready
                ? "Ready"
                : "Not loaded"}
          </p>
        </div>
        <span
          className={cn(
            "ml-auto shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
            ready
              ? "border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10 text-[oklch(0.735_0.155_158)]"
              : "border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/10 text-[oklch(0.815_0.145_88)]",
          )}
        >
          {ready ? "Loaded" : "Empty"}
        </span>
      </header>

      {/* Counts */}
      {status?.counts && (
        <div className="grid grid-cols-3 gap-px border-b border-border bg-border sm:grid-cols-5">
          {(
            [
              ["Roads", status.counts.roads],
              ["Vehicles", status.counts.vehicles],
              ["Incidents", status.counts.incidents],
              ["Alerts", status.counts.alerts],
              ["Deliveries", status.counts.deliveries],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-card p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                {label}
              </div>
              <div className="mt-0.5 text-lg font-semibold tabular">
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {status?.seededAt && (
        <p className="border-b border-border px-4 py-2 font-mono text-[10px] text-muted-foreground">
          Seeded {formatDateTime(status.seededAt)}
        </p>
      )}

      {/* Safe actions */}
      <div className="grid gap-2 p-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start gap-2 text-xs"
          disabled={busy !== null}
          onClick={() =>
            run("seed", async () => {
              const r = await seed({});
              return r.status === "seeded"
                ? `Loaded ${r.counts.roads} roads, ${r.counts.vehicles} vehicles, ${r.counts.incidents} incidents.`
                : "Demo data already present — nothing duplicated.";
            })
          }
        >
          {busy === "seed" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Database className="size-3.5" />
          )}
          {ready ? "Reload demo data" : "Load demo data"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-start gap-2 text-xs"
          disabled={busy !== null || !ready}
          onClick={() =>
            run("assess", async () => {
              const r = await assess({});
              return `Assessed ${r.assessed} locations — ${r.critical} critical, ${r.high} high, ${r.statusChanges} road status change(s).`;
            })
          }
        >
          {busy === "assess" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CircleCheck className="size-3.5" />
          )}
          Run full risk assessment
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 justify-start gap-2 text-xs text-muted-foreground"
          disabled={busy !== null || !ready}
          onClick={() =>
            run("reset", async () => {
              const r = await reset({});
              return `Scenario reset — removed ${r.removedIncidents} incident(s), ${r.removedAlerts} alert(s).`;
            })
          }
        >
          {busy === "reset" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Reset demo scenario
        </Button>
      </div>

      {outcome && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "mx-4 mb-4 flex items-start gap-2 rounded-md border px-2.5 py-2",
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

      {/* Destructive — deliberately separated */}
      <div className="border-t border-[oklch(0.648_0.201_22)]/25 bg-[oklch(0.648_0.201_22)]/5 p-4">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-[oklch(0.648_0.201_22)]" />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-[oklch(0.648_0.201_22)]">
              Delete all data
            </h4>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Permanently removes every user, road, vehicle, incident, alert,
              delivery, route, prediction and weather record from this
              deployment. There is no undo — the demo dataset can be reloaded,
              but anything entered by hand is gone.
            </p>

            <Button
              variant={armed ? "destructive" : "outline"}
              size="sm"
              className="mt-2.5 h-8 gap-1.5 text-xs"
              disabled={busy !== null}
              onClick={() => {
                if (!armed) {
                  setArmed(true);
                  return;
                }
                void run("clear", async () => {
                  await clearAll({ confirm: "DELETE_ALL_DATA" });
                  return "All data deleted. Load the demo dataset to start again.";
                });
              }}
            >
              {busy === "clear" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <TriangleAlert className="size-3" />
              )}
              {armed ? "Click again to confirm deletion" : "Delete all data"}
            </Button>

            {armed && (
              <button
                type="button"
                onClick={() => setArmed(false)}
                className="ml-2 text-[11px] text-muted-foreground underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

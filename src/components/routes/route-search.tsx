"use client";

import { useQuery } from "convex/react";
import { ArrowRight, Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

export type Priority = "normal" | "high" | "critical" | "emergency";

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
  { value: "emergency", label: "Emergency" },
];

/**
 * Route search.
 *
 * Origin and destination are chosen from the network's actual graph nodes —
 * not free text — because a route can only be computed between locations
 * that exist on the monitored corridor network. Offering a text box would
 * imply a geocoder that does not exist.
 */
export function RouteSearch({
  origin,
  destination,
  priority,
  onChange,
}: {
  origin: string;
  destination: string;
  priority: Priority;
  onChange: (next: {
    origin: string;
    destination: string;
    priority: Priority;
  }) => void;
}) {
  const network = useQuery(api.routeIntelligence.getNetworkNodes);
  const nodes = network?.nodes ?? [];

  // Which component each node belongs to, so we can warn before searching.
  const componentOf = (node: string) =>
    network?.components.findIndex((c) => c.includes(node)) ?? -1;

  const sameComponent =
    origin && destination
      ? componentOf(origin) === componentOf(destination) &&
        componentOf(origin) !== -1
      : true;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Route Search</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {network
              ? `${network.routableSegments} routable segments · ${network.blockedSegments} blocked`
              : "Loading network…"}
          </p>
        </div>
      </header>

      <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto_1fr_1fr]">
        <Field label="Origin">
          <select
            value={origin}
            onChange={(e) =>
              onChange({ origin: e.target.value, destination, priority })
            }
            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">Select origin…</option>
            {nodes.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </Field>

        <div className="hidden items-end pb-2 md:flex">
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>

        <Field label="Destination">
          <select
            value={destination}
            onChange={(e) =>
              onChange({ origin, destination: e.target.value, priority })
            }
            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">Select destination…</option>
            {nodes.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Delivery priority">
          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() =>
                  onChange({ origin, destination, priority: p.value })
                }
                aria-pressed={priority === p.value}
                className={cn(
                  "rounded border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  priority === p.value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {!sameComponent && origin && destination && (
        <p className="border-t border-border bg-[oklch(0.815_0.145_88)]/8 px-4 py-2 text-[11px] text-[oklch(0.815_0.145_88)]">
          {origin} and {destination} sit in separate components of the monitored
          network — no corridor connects them in the current data.
        </p>
      )}

      <p className="border-t border-border bg-background/40 px-4 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Corridor-level path selection between monitored network nodes. This is
        not turn-by-turn navigation and does not use a live routing service.
      </p>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

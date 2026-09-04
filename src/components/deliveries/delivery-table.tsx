"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { PackageCheck, Search, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { CARGO_LABEL } from "@/lib/risk";
import { formatDateTime, humanize, timeUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const ALL = "all";

const STATUS_TONE: Record<string, string> = {
  pending: "text-muted-foreground border-border bg-muted/40",
  in_transit:
    "text-[oklch(0.735_0.155_158)] border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10",
  delayed:
    "text-[oklch(0.727_0.163_55)] border-[oklch(0.727_0.163_55)]/35 bg-[oklch(0.727_0.163_55)]/10",
  delivered: "text-muted-foreground border-border bg-muted/40",
  cancelled: "text-muted-foreground/70 border-border bg-muted/30",
};

const PRIORITY_TONE: Record<string, string> = {
  normal: "text-muted-foreground",
  high: "text-[oklch(0.815_0.145_88)]",
  critical: "text-[oklch(0.727_0.163_55)]",
  emergency: "text-[oklch(0.648_0.201_22)]",
};

/**
 * Consignment register.
 *
 * Rows are ordered by operational urgency rather than creation time: delayed
 * first, then in transit, then by priority and earliest promised arrival —
 * so the loads that need a decision are always at the top.
 */
export function DeliveryTable() {
  const deliveries = useQuery(api.fleet.listDeliveriesDetailed);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);

  const rows = useMemo(() => {
    if (!deliveries) return undefined;
    const term = search.trim().toLowerCase();

    return deliveries.filter((d) => {
      if (status !== ALL && d.status !== status) return false;
      if (priority !== ALL && d.priority !== priority) return false;
      if (!term) return true;
      return (
        (d.vehicleNumber ?? "").toLowerCase().includes(term) ||
        d.destination.toLowerCase().includes(term) ||
        d.origin.toLowerCase().includes(term) ||
        (d.driverName ?? "").toLowerCase().includes(term)
      );
    });
  }, [deliveries, status, priority, search]);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="space-y-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <PackageCheck className="size-4 text-primary" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Consignments</h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {rows
                ? `${rows.length} of ${deliveries?.length ?? 0}`
                : "Loading"}
            </p>
          </div>

          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vehicle, route or driver…"
              aria-label="Search consignments"
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FilterRow
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              "pending",
              "in_transit",
              "delayed",
              "delivered",
              "cancelled",
            ]}
          />
          <FilterRow
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={["normal", "high", "critical", "emergency"]}
          />
          {(status !== ALL || priority !== ALL || search) && (
            <button
              type="button"
              onClick={() => {
                setStatus(ALL);
                setPriority(ALL);
                setSearch("");
              }}
              className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-2.5" />
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {[
                "Vehicle",
                "Cargo",
                "Priority",
                "Origin",
                "Destination",
                "Status",
                "Progress",
                "ETA",
                "Arrived",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === undefined &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td colSpan={9} className="px-3 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}

            {rows?.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  No consignments match these filters.
                </td>
              </tr>
            )}

            {rows?.map((d) => {
              const isPriority =
                d.priority === "critical" || d.priority === "emergency";

              return (
                <tr
                  key={d._id}
                  className={cn(
                    "border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20",
                    isPriority && "bg-[oklch(0.648_0.201_22)]/[0.04]",
                  )}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">
                    {d.vehicleNumber ?? "—"}
                    {d.driverName && (
                      <div className="font-sans text-[10px] font-normal text-muted-foreground">
                        {d.driverName}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {CARGO_LABEL[d.cargoType] ?? humanize(d.cargoType)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider",
                      PRIORITY_TONE[d.priority] ?? "text-muted-foreground",
                    )}
                  >
                    {d.priority}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {d.origin}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{d.destination}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        STATUS_TONE[d.status] ??
                          "border-border text-muted-foreground",
                      )}
                    >
                      {humanize(d.status)}
                    </span>
                    {d.routeStatus === "blocked" && (
                      <div className="mt-0.5 font-mono text-[9px] uppercase text-[oklch(0.648_0.201_22)]">
                        route blocked
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {d.progress !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              isPriority
                                ? "bg-[oklch(0.648_0.201_22)]"
                                : "bg-[oklch(0.715_0.128_231)]",
                            )}
                            style={{ width: `${Math.min(d.progress, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] tabular text-muted-foreground">
                          {Math.round(d.progress)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {d.status === "delivered"
                      ? "—"
                      : timeUntil(d.estimatedArrival)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {d.actualArrival ? formatDateTime(d.actualArrival) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-0.5 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </span>
      {[ALL, ...options].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === option
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
          )}
        >
          {option === ALL ? "all" : option.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}

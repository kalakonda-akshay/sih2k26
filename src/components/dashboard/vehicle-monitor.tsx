"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Truck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  CARGO_LABEL,
  RISK_TONE,
  VEHICLE_STATUS_TONE,
  type RiskLevel,
} from "@/lib/risk";
import { formatCoords, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Priority vehicle monitor.
 *
 * Ordering is computed server-side: emergency and delayed first, then by risk
 * band, then by most recent telemetry — so the vehicles that need attention
 * are always at the top without the client sorting anything.
 */
export function VehicleMonitor({ limit = 6 }: { limit?: number }) {
  const vehicles = useQuery(api.vehicles.getPriorityVehicles, { limit });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Truck className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Active Vehicle Monitor</h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Priority
        </span>
      </header>

      <div className="divide-y divide-border">
        {vehicles === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}

        {vehicles?.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No vehicles registered.
          </div>
        )}

        {vehicles?.map((vehicle) => {
          const statusTone =
            VEHICLE_STATUS_TONE[vehicle.status] ?? VEHICLE_STATUS_TONE.idle;
          const riskTone = RISK_TONE[vehicle.riskLevel as RiskLevel];

          return (
            <div
              key={vehicle._id}
              className="flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/30"
            >
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: statusTone.hex }}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-sm font-semibold tracking-tight">
                    {vehicle.vehicleNumber}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      statusTone.chip,
                      statusTone.border,
                      statusTone.text,
                    )}
                  >
                    {statusTone.label}
                  </span>
                </div>

                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {CARGO_LABEL[vehicle.cargoType] ?? vehicle.cargoType}
                  {" · "}
                  {formatCoords(vehicle.latitude, vehicle.longitude)}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-xs">
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="text-foreground/90">
                      {vehicle.destination}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] tabular text-muted-foreground">
                    {Math.round(vehicle.speed)} km/h
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider",
                      riskTone.text,
                    )}
                  >
                    {riskTone.label} risk
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {timeAgo(vehicle.lastUpdated)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-border p-3">
        {/*
          This is navigation, so it must be a real anchor. Base UI's Button
          sets `nativeButton` true and warns when `render` yields a non-button;
          styling the Link with `buttonVariants` gives correct link semantics
          instead of emulating a button on top of an <a>.
        */}
        <Link
          href="/vehicles"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full text-xs",
          )}
        >
          View all vehicles
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

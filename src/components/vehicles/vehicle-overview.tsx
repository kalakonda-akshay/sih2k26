"use client";

import { useQuery } from "convex/react";
import {
  CirclePause,
  PackageCheck,
  Siren,
  Timer,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MetricCard } from "@/components/dashboard/metric-card";

/**
 * Fleet overview.
 *
 * Every figure comes from `fleet.getFleetOverview`, one reactive query. The
 * "in high-risk zone" count is computed server-side by the same exposure
 * model the high-risk list uses, so the number and the list can never
 * disagree.
 */
export function VehicleOverview() {
  const f = useQuery(api.fleet.getFleetOverview);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="Total Registered"
        value={f?.totalVehicles}
        icon={Truck}
        tone="neutral"
        context={f ? `${f.idleVehicles} idle` : undefined}
      />
      <MetricCard
        label="Active Vehicles"
        value={f?.activeVehicles}
        total={f?.totalVehicles}
        icon={Truck}
        tone="safe"
        context={f ? "En route now" : undefined}
      />
      <MetricCard
        label="Delayed Vehicles"
        value={f?.delayedVehicles}
        total={f?.totalVehicles}
        icon={Timer}
        tone="moderate"
        context={f ? `${f.delayedDeliveries} delayed loads` : undefined}
      />
      <MetricCard
        label="Emergency Vehicles"
        value={f?.emergencyVehicles}
        icon={Siren}
        tone="critical"
        context={f ? "Priority response" : undefined}
      />
      <MetricCard
        label="In High-Risk Zones"
        value={f?.inHighRiskZone}
        total={f?.totalVehicles}
        icon={TriangleAlert}
        tone="high"
        context={f ? "Proximity exposure" : undefined}
      />
      <MetricCard
        label="Critical Deliveries"
        value={f?.criticalDeliveries}
        total={f?.activeDeliveries}
        icon={PackageCheck}
        tone="critical"
        context={f ? "Critical or emergency" : undefined}
      />
    </div>
  );
}

/** Compact status strip used above the delivery table. */
export function FleetStatusStrip() {
  const f = useQuery(api.fleet.getFleetOverview);

  const items = [
    { label: "Active deliveries", value: f?.activeDeliveries, icon: PackageCheck },
    { label: "Delayed", value: f?.delayedDeliveries, icon: Timer },
    { label: "Critical priority", value: f?.criticalDeliveries, icon: Siren },
    { label: "Idle vehicles", value: f?.idleVehicles, icon: CirclePause },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
        >
          <item.icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
              {item.label}
            </div>
            <div className="text-lg font-semibold leading-tight tabular">
              {item.value ?? "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

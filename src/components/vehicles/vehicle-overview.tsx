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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const f = useQuery(api.fleet.getFleetOverview);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label={t("vehicles.metrics.total_registered", "Total Registered")}
        value={f?.totalVehicles}
        icon={Truck}
        tone="neutral"
        context={f ? `${f.idleVehicles} ${t("vehicles.status_idle", "idle")}` : undefined}
      />
      <MetricCard
        label={t("dashboard.metrics.active_vehicles", "Active Vehicles")}
        value={f?.activeVehicles}
        total={f?.totalVehicles}
        icon={Truck}
        tone="safe"
        context={f ? t("vehicles.en_route_now", "En route now") : undefined}
      />
      <MetricCard
        label={t("vehicles.metrics.delayed_vehicles", "Delayed Vehicles")}
        value={f?.delayedVehicles}
        total={f?.totalVehicles}
        icon={Timer}
        tone="moderate"
        context={f ? `${f.delayedDeliveries} ${t("vehicles.delayed_loads", "delayed loads")}` : undefined}
      />
      <MetricCard
        label={t("vehicles.metrics.emergency_vehicles", "Emergency Vehicles")}
        value={f?.emergencyVehicles}
        icon={Siren}
        tone="critical"
        context={f ? t("vehicles.priority_response", "Priority response") : undefined}
      />
      <MetricCard
        label={t("vehicles.metrics.in_high_risk_zones", "In High-Risk Zones")}
        value={f?.inHighRiskZone}
        total={f?.totalVehicles}
        icon={TriangleAlert}
        tone="high"
        context={f ? t("vehicles.proximity_exposure", "Proximity exposure") : undefined}
      />
      <MetricCard
        label={t("vehicles.metrics.critical_deliveries", "Critical Deliveries")}
        value={f?.criticalDeliveries}
        total={f?.activeDeliveries}
        icon={PackageCheck}
        tone="critical"
        context={f ? t("vehicles.critical_or_emergency", "Critical or emergency") : undefined}
      />
    </div>
  );
}

/** Compact status strip used above the delivery table. */
export function FleetStatusStrip() {
  const { t } = useTranslation();
  const f = useQuery(api.fleet.getFleetOverview);

  const items = [
    { label: t("dashboard.metrics.active_deliveries", "Active deliveries"), value: f?.activeDeliveries, icon: PackageCheck },
    { label: t("vehicles.status_delayed", "Delayed"), value: f?.delayedDeliveries, icon: Timer },
    { label: t("deliveries.priority_critical", "Critical priority"), value: f?.criticalDeliveries, icon: Siren },
    { label: t("vehicles.status_idle", "Idle vehicles"), value: f?.idleVehicles, icon: CirclePause },
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

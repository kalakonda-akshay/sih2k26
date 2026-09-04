"use client";

import { useQuery } from "convex/react";
import {
  BellRing,
  CircleCheck,
  Ban,
  MapPinned,
  PackageCheck,
  TriangleAlert,
  TrendingUp,
  Truck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MetricCard } from "./metric-card";

/**
 * The eight headline counters.
 *
 * Every value comes from `dashboard.getMetrics`, a single reactive query.
 * Nothing here is hardcoded, and nothing polls — Convex pushes a new result
 * whenever any underlying table changes.
 */
export function MetricsGrid() {
  const m = useQuery(api.dashboard.getMetrics);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <MetricCard
        label="Active Vehicles"
        value={m?.activeVehicles}
        total={m?.totalVehicles}
        icon={Truck}
        tone="safe"
        context={
          m ? `${m.delayedVehicles} delayed · ${m.emergencyVehicles} emergency` : undefined
        }
      />
      <MetricCard
        label="Safe Roads"
        value={m?.safeRoads}
        total={m?.totalRoads}
        icon={CircleCheck}
        tone="safe"
        context={m ? `${m.networkHealth}% network health` : undefined}
      />
      <MetricCard
        label="High-Risk Roads"
        value={m?.highRiskRoads}
        total={m?.totalRoads}
        icon={TrendingUp}
        tone="high"
        context={m ? `${m.restrictedRoads} restricted` : undefined}
      />
      <MetricCard
        label="Blocked Roads"
        value={m?.blockedRoads}
        total={m?.totalRoads}
        icon={Ban}
        tone="critical"
        context={m ? "Impassable to all traffic" : undefined}
      />
      <MetricCard
        label="Active Incidents"
        value={m?.activeIncidents}
        icon={TriangleAlert}
        tone={m && m.criticalIncidents > 0 ? "critical" : "moderate"}
        context={
          m ? `${m.criticalIncidents} critical · ${m.incidentsLast24h} in 24h` : undefined
        }
      />
      <MetricCard
        label="Critical Alerts"
        value={m?.criticalAlerts}
        total={m?.activeAlerts}
        icon={BellRing}
        tone="critical"
        context={m ? `${m.activeAlerts} active in total` : undefined}
      />
      <MetricCard
        label="Active Deliveries"
        value={m?.activeDeliveries}
        icon={PackageCheck}
        tone="neutral"
        context={
          m
            ? `${m.delayedDeliveries} delayed · ${m.emergencyDeliveries} priority`
            : undefined
        }
      />
      <MetricCard
        label="High-Risk Districts"
        value={m?.highRiskDistricts}
        icon={MapPinned}
        tone={m && m.highRiskDistricts > 4 ? "critical" : "high"}
        context={
          m && m.highRiskDistrictNames.length > 0
            ? m.highRiskDistrictNames.slice(0, 2).join(", ") +
              (m.highRiskDistrictNames.length > 2
                ? ` +${m.highRiskDistrictNames.length - 2}`
                : "")
            : undefined
        }
      />
    </div>
  );
}

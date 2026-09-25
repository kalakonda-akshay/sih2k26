"use client";

import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const m = useQuery(api.dashboard.getMetrics);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <MetricCard
        label={t("dashboard.metrics.active_vehicles", "Active Vehicles")}
        value={m?.activeVehicles}
        total={m?.totalVehicles}
        icon={Truck}
        tone="safe"
        context={
          m
            ? t("dashboard.metrics.vehicles_context", "{{delayed}} delayed · {{emergency}} emergency", {
                delayed: m.delayedVehicles,
                emergency: m.emergencyVehicles,
              })
            : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.safe_roads", "Safe Roads")}
        value={m?.safeRoads}
        total={m?.totalRoads}
        icon={CircleCheck}
        tone="safe"
        context={
          m
            ? t("dashboard.metrics.safe_roads_context", "{{health}}% network health", {
                health: m.networkHealth,
              })
            : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.high_risk_roads", "High-Risk Roads")}
        value={m?.highRiskRoads}
        total={m?.totalRoads}
        icon={TrendingUp}
        tone="high"
        context={
          m
            ? t("dashboard.metrics.high_risk_context", "{{restricted}} restricted", {
                restricted: m.restrictedRoads,
              })
            : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.blocked_roads", "Blocked Roads")}
        value={m?.blockedRoads}
        total={m?.totalRoads}
        icon={Ban}
        tone="critical"
        context={
          m
            ? t("dashboard.metrics.blocked_roads_context", "Impassable to all traffic")
            : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.active_incidents", "Active Incidents")}
        value={m?.activeIncidents}
        icon={TriangleAlert}
        tone={m && m.criticalIncidents > 0 ? "critical" : "moderate"}
        context={
          m
            ? t("dashboard.metrics.incidents_context", "{{critical}} critical · {{recent}} in 24h", {
                critical: m.criticalIncidents,
                recent: m.incidentsLast24h,
              })
            : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.critical_alerts", "Critical Alerts")}
        value={m?.criticalAlerts}
        total={m?.activeAlerts}
        icon={BellRing}
        tone="critical"
        context={
          m
            ? t("dashboard.metrics.alerts_context", "Immediate action required")
            : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.active_deliveries", "Active Deliveries")}
        value={m?.activeDeliveries}
        icon={PackageCheck}
        tone="neutral"
        context={
          m
            ? t("dashboard.metrics.deliveries_context", "{{critical}} critical consignments", {
                critical: m.emergencyDeliveries,
              })
            : undefined
        }
      />
      <MetricCard
        label={t("analytics.district_intelligence", "High-Risk Districts")}
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

"use client";

import { useQuery } from "convex/react";
import {
  Activity,
  BellRing,
  PackageCheck,
  Route as RouteIcon,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { TimeWindow } from "./time-range";

/**
 * Totals for the selected window.
 *
 * These are counts of documents *created inside the window*, so changing the
 * range changes the numbers rather than relabelling a fixed snapshot.
 */
export function WindowSummary({ window }: { window: TimeWindow }) {
  const { t } = useTranslation();
  const s = useQuery(api.analytics.getAnalyticsSummary, { window });

  const label =
    window === "24h"
      ? t("common.last_24h", "24h")
      : window === "7d"
        ? t("common.last_7d", "7 days")
        : t("common.last_30d", "30 days");

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label={t("dashboard.metrics.logistics_activity", "Logistics Activity")}
        value={s?.totalActivity}
        icon={Activity}
        tone="neutral"
        context={s ? t("analytics.events_in_window", "Events in {{window}}", { window: label }) : undefined}
      />
      <MetricCard
        label={t("dashboard.metrics.incidents_reported", "Incidents Reported")}
        value={s?.incidents}
        icon={TriangleAlert}
        tone={s && s.incidentsBySeverity.critical > 0 ? "critical" : "high"}
        context={
          s ? t("analytics.critical_in_window", "{{count}} critical in {{window}}", { count: s.incidentsBySeverity.critical, window: label }) : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.alerts_raised", "Alerts Raised")}
        value={s?.alerts}
        icon={BellRing}
        tone="high"
        context={s ? t("analytics.acknowledged_count", "{{count}} acknowledged", { count: s.acknowledgedAlerts }) : undefined}
      />
      <MetricCard
        label={t("routes.disruptions", "Route Disruptions")}
        value={s?.routeDisruptions}
        icon={RouteIcon}
        tone="moderate"
        context={s ? t("analytics.blocked_now", "{{count}} corridors blocked now", { count: s.blockedRoads }) : undefined}
      />
      <MetricCard
        label={t("dashboard.metrics.on_time_rate", "On-Time Rate")}
        value={s?.onTimeRate}
        icon={PackageCheck}
        tone={
          s === undefined
            ? "neutral"
            : s.onTimeRate >= 80
              ? "safe"
              : s.onTimeRate >= 50
                ? "moderate"
                : "critical"
        }
        context={
          s ? t("analytics.delayed_count", "{{delayed}}/{{total}} delayed", { delayed: s.delayedDeliveries, total: s.activeDeliveries }) : undefined
        }
      />
      <MetricCard
        label={t("dashboard.metrics.fleet_utilisation", "Fleet Utilisation")}
        value={s?.utilisation}
        icon={Truck}
        tone={
          s === undefined ? "neutral" : s.utilisation >= 60 ? "safe" : "moderate"
        }
        context={
          s ? t("analytics.moving_count", "{{moving}}/{{total}} moving", { moving: s.movingVehicles, total: s.totalVehicles }) : undefined
        }
      />
    </div>
  );
}

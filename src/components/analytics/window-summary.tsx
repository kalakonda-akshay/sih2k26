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
  const s = useQuery(api.analytics.getAnalyticsSummary, { window });

  const label =
    window === "24h" ? "24h" : window === "7d" ? "7 days" : "30 days";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="Logistics Activity"
        value={s?.totalActivity}
        icon={Activity}
        tone="neutral"
        context={s ? `Events in ${label}` : undefined}
      />
      <MetricCard
        label="Incidents Reported"
        value={s?.incidents}
        icon={TriangleAlert}
        tone={s && s.incidentsBySeverity.critical > 0 ? "critical" : "high"}
        context={
          s ? `${s.incidentsBySeverity.critical} critical in ${label}` : undefined
        }
      />
      <MetricCard
        label="Alerts Raised"
        value={s?.alerts}
        icon={BellRing}
        tone="high"
        context={s ? `${s.acknowledgedAlerts} acknowledged` : undefined}
      />
      <MetricCard
        label="Route Disruptions"
        value={s?.routeDisruptions}
        icon={RouteIcon}
        tone="moderate"
        context={s ? `${s.blockedRoads} corridors blocked now` : undefined}
      />
      <MetricCard
        label="On-Time Rate"
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
          s ? `${s.delayedDeliveries}/${s.activeDeliveries} delayed` : undefined
        }
      />
      <MetricCard
        label="Fleet Utilisation"
        value={s?.utilisation}
        icon={Truck}
        tone={
          s === undefined ? "neutral" : s.utilisation >= 60 ? "safe" : "moderate"
        }
        context={
          s ? `${s.movingVehicles}/${s.totalVehicles} moving` : undefined
        }
      />
    </div>
  );
}

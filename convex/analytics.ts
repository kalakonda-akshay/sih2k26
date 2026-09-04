import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { riskLevelFromScore } from "./lib/helpers";
import {
  bucketAverages,
  bucketCountFor,
  bucketTimestamps,
  calculateDistrictHealth,
  calculateOperationalHealth,
  windowStart,
  type TimeWindowKey,
} from "./lib/analytics";

/** Shared validator for the time-range control. */
const timeWindow = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
);

/** Latest prediction per location — the engine appends rather than updates. */
function latestPredictions(all: Doc<"riskPredictions">[]) {
  const latest = new Map<string, Doc<"riskPredictions">>();
  for (const p of all) {
    const seen = latest.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
  }
  return [...latest.values()];
}

/* ------------------------------------------------- operational health */

/**
 * NER Logistics Health Score with its full component breakdown.
 *
 * Deterministic and fully attributable — every one of the six components is
 * a ratio of real counts with a stated explanation, and the caps sum to 100.
 */
export const getOperationalHealth = query({
  args: {},
  handler: async (ctx) => {
    const [roads, incidents, vehicles, deliveries, alerts, predictions] =
      await Promise.all([
        ctx.db.query("roads").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("riskPredictions").collect(),
      ]);

    const current = latestPredictions(predictions);
    const activeIncidents = incidents.filter((i) => i.status === "active");
    const activeDeliveries = deliveries.filter(
      (d) => d.status === "in_transit" || d.status === "delayed",
    );

    const averagePredictedRisk =
      current.length === 0
        ? 0
        : current.reduce((sum, p) => sum + p.riskScore, 0) / current.length;

    const health = calculateOperationalHealth({
      totalRoads: roads.length,
      accessibleRoads: roads.filter(
        (r) => r.accessibilityStatus === "accessible",
      ).length,
      restrictedRoads: roads.filter(
        (r) => r.accessibilityStatus === "restricted",
      ).length,
      blockedRoads: roads.filter((r) => r.accessibilityStatus === "blocked")
        .length,

      activeIncidents: activeIncidents.length,
      criticalIncidents: activeIncidents.filter(
        (i) => i.severity === "critical",
      ).length,

      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter(
        (v) => v.status === "active" || v.status === "idle",
      ).length,
      offlineVehicles: vehicles.filter((v) => v.status === "offline").length,

      totalActiveDeliveries: activeDeliveries.length,
      delayedDeliveries: activeDeliveries.filter((d) => d.status === "delayed")
        .length,

      unacknowledgedCriticalAlerts: alerts.filter(
        (a) => a.status === "active" && a.severity === "critical",
      ).length,

      averagePredictedRisk,
    });

    return { ...health, computedAt: Date.now() };
  },
});

/* ------------------------------------------------------ window summary */

/**
 * Totals for the selected window.
 *
 * Everything here respects `window`: counts are of documents *created* inside
 * it, so switching the range genuinely changes the numbers rather than
 * re-labelling the same snapshot.
 */
export const getAnalyticsSummary = query({
  args: { window: timeWindow },
  handler: async (ctx, { window }) => {
    const now = Date.now();
    const from = windowStart(window as TimeWindowKey, now);

    const [incidents, alerts, deliveries, activity, vehicles, roads] =
      await Promise.all([
        ctx.db.query("incidents").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db
          .query("activityLog")
          .withIndex("by_createdAt")
          .order("desc")
          .take(2000),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("roads").collect(),
      ]);

    const inWindow = <T extends { createdAt: number }>(rows: T[]) =>
      rows.filter((r) => r.createdAt >= from);

    const windowIncidents = inWindow(incidents);
    const windowAlerts = inWindow(alerts);
    const windowActivity = inWindow(activity);

    // Route disruption = an activity entry recording a corridor closing or
    // a route being invalidated. Derived from the log rather than guessed.
    const routeDisruptions = windowActivity.filter(
      (a) =>
        a.eventType === "road_status_change" ||
        a.eventType === "route_generated",
    ).length;

    const deliveriesCompleted = deliveries.filter(
      (d) => d.actualArrival !== undefined && d.actualArrival >= from,
    ).length;

    const activeDeliveries = deliveries.filter(
      (d) => d.status === "in_transit" || d.status === "delayed",
    );
    const delayed = activeDeliveries.filter((d) => d.status === "delayed");

    const onTimeRate =
      activeDeliveries.length === 0
        ? 100
        : Math.round(
            ((activeDeliveries.length - delayed.length) /
              activeDeliveries.length) *
              100,
          );

    // Utilisation: share of the fleet actually moving rather than parked.
    const movingVehicles = vehicles.filter(
      (v) => v.status === "active" || v.status === "emergency",
    ).length;
    const utilisation =
      vehicles.length === 0
        ? 0
        : Math.round((movingVehicles / vehicles.length) * 100);

    const incidentsBySeverity = {
      critical: windowIncidents.filter((i) => i.severity === "critical").length,
      high: windowIncidents.filter((i) => i.severity === "high").length,
      medium: windowIncidents.filter((i) => i.severity === "medium").length,
      low: windowIncidents.filter((i) => i.severity === "low").length,
    };

    const incidentsByType = new Map<string, number>();
    for (const incident of windowIncidents) {
      incidentsByType.set(
        incident.incidentType,
        (incidentsByType.get(incident.incidentType) ?? 0) + 1,
      );
    }

    return {
      window,
      from,
      to: now,

      totalActivity: windowActivity.length,
      incidents: windowIncidents.length,
      incidentsBySeverity,
      incidentsByType: [...incidentsByType.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),

      alerts: windowAlerts.length,
      criticalAlerts: windowAlerts.filter((a) => a.severity === "critical")
        .length,
      acknowledgedAlerts: windowAlerts.filter(
        (a) => a.status === "acknowledged" || a.status === "resolved",
      ).length,

      routeDisruptions,
      deliveriesCompleted,
      activeDeliveries: activeDeliveries.length,
      delayedDeliveries: delayed.length,
      onTimeRate,

      utilisation,
      movingVehicles,
      totalVehicles: vehicles.length,
      blockedRoads: roads.filter((r) => r.accessibilityStatus === "blocked")
        .length,
      totalRoads: roads.length,
    };
  },
});

/* ------------------------------------------------------------- trends */

/**
 * Time series for the trend charts.
 *
 * Buckets are evenly spaced across the window (12 for 24h, 7 for a week,
 * 15 for a month) so the chart shape is comparable between ranges.
 */
export const getTrends = query({
  args: { window: timeWindow },
  handler: async (ctx, { window }) => {
    const now = Date.now();
    const key = window as TimeWindowKey;
    const from = windowStart(key, now);
    const buckets = bucketCountFor(key);

    const [incidents, alerts, predictions, activity] = await Promise.all([
      ctx.db.query("incidents").collect(),
      ctx.db.query("alerts").collect(),
      ctx.db.query("riskPredictions").collect(),
      ctx.db
        .query("activityLog")
        .withIndex("by_createdAt")
        .order("desc")
        .take(2000),
    ]);

    return {
      window,
      from,
      to: now,
      incidents: bucketTimestamps(
        incidents.map((i) => i.createdAt),
        from,
        now,
        buckets,
      ),
      alerts: bucketTimestamps(
        alerts.map((a) => a.createdAt),
        from,
        now,
        buckets,
      ),
      vehicleActivity: bucketTimestamps(
        activity
          .filter(
            (a) =>
              a.eventType === "vehicle_movement" ||
              a.eventType === "vehicle_status_change",
          )
          .map((a) => a.createdAt),
        from,
        now,
        buckets,
      ),
      riskScore: bucketAverages(
        predictions.map((p) => ({ ts: p.createdAt, value: p.riskScore })),
        from,
        now,
        buckets,
      ),
    };
  },
});

/* ------------------------------------------------ district intelligence */

/**
 * Per-district operational picture.
 *
 * Districts are the unit authorities actually act on — a state-level average
 * hides the one block that is cut off. Sorted worst-health first so the
 * districts needing attention are at the top without the user sorting.
 */
export const getDistrictIntelligence = query({
  args: { window: timeWindow },
  handler: async (ctx, { window }) => {
    const now = Date.now();
    const from = windowStart(window as TimeWindowKey, now);

    const [roads, incidents, alerts, predictions, vehicles, deliveries] =
      await Promise.all([
        ctx.db.query("roads").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
      ]);

    const current = latestPredictions(predictions);

    interface Row {
      district: string;
      state: string;
      totalRoads: number;
      accessibleRoads: number;
      restrictedRoads: number;
      blockedRoads: number;
      activeIncidents: number;
      windowIncidents: number;
      criticalAlerts: number;
      activeVehicles: number;
      deliveries: number;
      averageRisk: number;
      riskLevel: string;
      healthScore: number;
    }

    const byDistrict = new Map<string, Row>();
    const ensure = (district: string, state: string): Row => {
      const existing = byDistrict.get(district);
      if (existing) return existing;
      const row: Row = {
        district,
        state,
        totalRoads: 0,
        accessibleRoads: 0,
        restrictedRoads: 0,
        blockedRoads: 0,
        activeIncidents: 0,
        windowIncidents: 0,
        criticalAlerts: 0,
        activeVehicles: 0,
        deliveries: 0,
        averageRisk: 0,
        riskLevel: "low",
        healthScore: 100,
      };
      byDistrict.set(district, row);
      return row;
    };

    for (const road of roads) {
      const row = ensure(road.district, road.state);
      row.totalRoads += 1;
      if (road.accessibilityStatus === "accessible") row.accessibleRoads += 1;
      else if (road.accessibilityStatus === "restricted")
        row.restrictedRoads += 1;
      else row.blockedRoads += 1;
    }

    for (const incident of incidents) {
      const row = ensure(incident.district, incident.state);
      if (incident.status === "active") row.activeIncidents += 1;
      if (incident.createdAt >= from) row.windowIncidents += 1;
    }

    for (const alert of alerts) {
      if (!alert.district) continue;
      if (alert.status !== "active" || alert.severity !== "critical") continue;
      const row = ensure(alert.district, alert.state ?? "");
      row.criticalAlerts += 1;
    }

    // Risk is averaged over the district's monitored locations.
    const riskByDistrict = new Map<string, number[]>();
    for (const prediction of current) {
      const list = riskByDistrict.get(prediction.district) ?? [];
      list.push(prediction.riskScore);
      riskByDistrict.set(prediction.district, list);
      ensure(prediction.district, prediction.state);
    }

    /**
     * Vehicles carry no district field — they move between them — so each
     * moving vehicle is attributed to the district of the nearest corridor.
     * Distance here is a cheap Manhattan approximation on degrees, which is
     * sufficient for bucketing into a district and far cheaper than a
     * great-circle pass over every road for every vehicle.
     */
    const roadByDistrict = new Map<string, Doc<"roads">[]>();
    for (const road of roads) {
      const list = roadByDistrict.get(road.district) ?? [];
      list.push(road);
      roadByDistrict.set(road.district, list);
    }

    for (const vehicle of vehicles) {
      if (vehicle.status !== "active" && vehicle.status !== "emergency")
        continue;
      let bestDistrict: string | null = null;
      let bestDistance = Infinity;
      for (const road of roads) {
        const d =
          Math.abs(road.startLatitude - vehicle.latitude) +
          Math.abs(road.startLongitude - vehicle.longitude);
        if (d < bestDistance) {
          bestDistance = d;
          bestDistrict = road.district;
        }
      }
      if (bestDistrict) {
        const road = roadByDistrict.get(bestDistrict)?.[0];
        ensure(bestDistrict, road?.state ?? "").activeVehicles += 1;
      }
    }

    for (const delivery of deliveries) {
      if (delivery.status === "delivered" || delivery.status === "cancelled")
        continue;
      const match = roads.find((r) => r.district === delivery.destination);
      if (match) ensure(match.district, match.state).deliveries += 1;
    }

    for (const row of byDistrict.values()) {
      const scores = riskByDistrict.get(row.district) ?? [];
      row.averageRisk =
        scores.length === 0
          ? 0
          : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      row.riskLevel = riskLevelFromScore(row.averageRisk);
      row.healthScore = calculateDistrictHealth({
        totalRoads: row.totalRoads,
        accessibleRoads: row.accessibleRoads,
        blockedRoads: row.blockedRoads,
        activeIncidents: row.activeIncidents,
        criticalAlerts: row.criticalAlerts,
        averagePredictedRisk: row.averageRisk,
      });
    }

    return [...byDistrict.values()].sort(
      (a, b) => a.healthScore - b.healthScore,
    );
  },
});

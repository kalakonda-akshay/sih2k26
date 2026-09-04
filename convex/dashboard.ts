import { v } from "convex/values";
import { query } from "./_generated/server";
import { activityCategory } from "./lib/validators";
import { DAY, RISK_RANK, SEVERITY_RANK } from "./lib/helpers";

/**
 * Every headline metric on the command dashboard, computed from live data in
 * a single reactive subscription.
 *
 * One query rather than eight means one websocket subscription and one
 * consistent snapshot — the cards can never disagree with each other. Convex
 * re-runs this automatically whenever any table it touched changes, which is
 * why the dashboard needs no polling and no refresh button.
 *
 * At demo scale (hundreds of rows) collecting each table is the right call.
 * If the fleet grows past a few thousand documents, the counts move to an
 * incrementally-maintained aggregate table rather than a scan.
 */
export const getMetrics = query({
  args: {},
  handler: async (ctx) => {
    const [vehicles, roads, incidents, alerts, deliveries, predictions] =
      await Promise.all([
        ctx.db.query("vehicles").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("riskPredictions").collect(),
      ]);

    const activeVehicles = vehicles.filter(
      (v) => v.status === "active" || v.status === "emergency",
    ).length;
    const delayedVehicles = vehicles.filter((v) => v.status === "delayed")
      .length;
    const emergencyVehicles = vehicles.filter((v) => v.status === "emergency")
      .length;
    const vehiclesAtRisk = vehicles.filter(
      (v) => v.riskLevel === "high" || v.riskLevel === "critical",
    ).length;

    const safeRoads = roads.filter(
      (r) => r.accessibilityStatus === "accessible",
    ).length;
    const restrictedRoads = roads.filter(
      (r) => r.accessibilityStatus === "restricted",
    ).length;
    const blockedRoads = roads.filter(
      (r) => r.accessibilityStatus === "blocked",
    ).length;
    const highRiskRoads = roads.filter(
      (r) => r.riskLevel === "high" || r.riskLevel === "critical",
    ).length;

    const activeIncidents = incidents.filter((i) => i.status === "active");
    const criticalIncidents = activeIncidents.filter(
      (i) => i.severity === "critical",
    ).length;
    const incidentsLast24h = incidents.filter(
      (i) => i.createdAt > Date.now() - DAY,
    ).length;

    const activeAlerts = alerts.filter((a) => a.status === "active");
    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === "critical",
    ).length;

    const activeDeliveries = deliveries.filter(
      (d) => d.status === "in_transit" || d.status === "delayed",
    ).length;
    const delayedDeliveries = deliveries.filter((d) => d.status === "delayed")
      .length;
    const emergencyDeliveries = deliveries.filter(
      (d) => d.priority === "emergency" || d.priority === "critical",
    ).length;

    /**
     * A district counts as high-risk if it carries a high/critical road, an
     * active critical incident, or a high/critical prediction. Deduplicated
     * across all three sources.
     */
    const riskDistricts = new Set<string>();
    for (const road of roads) {
      if (road.riskLevel === "high" || road.riskLevel === "critical") {
        riskDistricts.add(road.district);
      }
    }
    for (const incident of activeIncidents) {
      if (incident.severity === "critical" || incident.severity === "high") {
        riskDistricts.add(incident.district);
      }
    }
    for (const prediction of predictions) {
      if (
        prediction.riskLevel === "high" ||
        prediction.riskLevel === "critical"
      ) {
        riskDistricts.add(prediction.district);
      }
    }

    const totalRoads = roads.length;
    const networkHealth =
      totalRoads === 0
        ? 100
        : Math.round(((safeRoads + restrictedRoads * 0.5) / totalRoads) * 100);

    return {
      activeVehicles,
      delayedVehicles,
      emergencyVehicles,
      vehiclesAtRisk,
      totalVehicles: vehicles.length,

      safeRoads,
      restrictedRoads,
      blockedRoads,
      highRiskRoads,
      totalRoads,

      activeIncidents: activeIncidents.length,
      criticalIncidents,
      incidentsLast24h,

      activeAlerts: activeAlerts.length,
      criticalAlerts,

      activeDeliveries,
      delayedDeliveries,
      emergencyDeliveries,

      highRiskDistricts: riskDistricts.size,
      highRiskDistrictNames: [...riskDistricts].sort(),

      networkHealth,
      lastUpdated: Date.now(),
    };
  },
});

/** Operational activity feed for the dashboard timeline. */
export const getActivityFeed = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(activityCategory),
  },
  handler: async (ctx, { limit = 20, category }) => {
    if (category) {
      const entries = await ctx.db
        .query("activityLog")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
      entries.sort((a, b) => b.createdAt - a.createdAt);
      return entries.slice(0, limit);
    }

    return await ctx.db
      .query("activityLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});

/**
 * Per-state rollup for the analytics view: how much of each state's network
 * is open, and how much trouble it is currently carrying.
 */
export const getStateBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const [roads, incidents] = await Promise.all([
      ctx.db.query("roads").collect(),
      ctx.db
        .query("incidents")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
    ]);

    const byState = new Map<
      string,
      {
        state: string;
        totalRoads: number;
        blocked: number;
        restricted: number;
        accessible: number;
        incidents: number;
        avgRiskScore: number;
      }
    >();

    for (const road of roads) {
      const entry = byState.get(road.state) ?? {
        state: road.state,
        totalRoads: 0,
        blocked: 0,
        restricted: 0,
        accessible: 0,
        incidents: 0,
        avgRiskScore: 0,
      };
      entry.totalRoads += 1;
      entry.avgRiskScore += road.riskScore;
      if (road.accessibilityStatus === "blocked") entry.blocked += 1;
      else if (road.accessibilityStatus === "restricted") entry.restricted += 1;
      else entry.accessible += 1;
      byState.set(road.state, entry);
    }

    for (const incident of incidents) {
      const entry = byState.get(incident.state);
      if (entry) entry.incidents += 1;
    }

    return [...byState.values()]
      .map((e) => ({
        ...e,
        avgRiskScore:
          e.totalRoads === 0 ? 0 : Math.round(e.avgRiskScore / e.totalRoads),
      }))
      .sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  },
});

/**
 * Highest-priority items across alerts, incidents and predictions — the
 * "what needs attention right now" strip.
 */
export const getAttentionQueue = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const [alerts, predictions] = await Promise.all([
      ctx.db
        .query("alerts")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
      ctx.db.query("riskPredictions").collect(),
    ]);

    const topAlerts = alerts
      .sort((a, b) => {
        const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        return s !== 0 ? s : b.createdAt - a.createdAt;
      })
      .slice(0, limit);

    const topPredictions = predictions
      .sort((a, b) => {
        const r = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
        return r !== 0 ? r : b.riskScore - a.riskScore;
      })
      .slice(0, limit);

    return { alerts: topAlerts, predictions: topPredictions };
  },
});

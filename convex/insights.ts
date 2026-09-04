import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { windowStart, type TimeWindowKey } from "./lib/analytics";
import { RISK_RANK } from "./lib/helpers";

/**
 * Decision intelligence and recommendations.
 *
 * ## What this is
 *
 * A set of **deterministic detectors** over real Convex data. Each one is a
 * named rule with a stated threshold; running it twice on the same database
 * gives the same answer. It is not a model, and the UI does not claim it is.
 *
 * ## Why that is the right call for now
 *
 * These insights drive operational decisions — dispatching officers, holding
 * consignments. A rule an operator can check is worth more than a prediction
 * they cannot audit. The interface is shaped so a model could later produce
 * the same `Insight` objects without the frontend changing.
 */

const timeWindow = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
);

export type InsightSeverity = "critical" | "high" | "medium" | "low";

export interface Insight {
  /** Stable rule identifier. */
  code:
    | "rising_district_risk"
    | "repeat_route_disruption"
    | "incident_cluster"
    | "delivery_degradation"
    | "idle_capacity"
    | "blocked_corridor_with_priority_load";
  severity: InsightSeverity;
  title: string;
  /** What the rule observed, in plain language with the numbers in it. */
  detail: string;
  /** The threshold that fired, so the reader can judge the rule itself. */
  rule: string;
  affected?: {
    district?: string;
    state?: string;
    roadNumber?: string;
    vehicleNumber?: string;
  };
}

function latestPerLocation(all: Doc<"riskPredictions">[]) {
  const latest = new Map<string, Doc<"riskPredictions">>();
  for (const p of all) {
    const seen = latest.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
  }
  return latest;
}

/** The prediction immediately before the current one, per location. */
function previousPerLocation(all: Doc<"riskPredictions">[]) {
  const byLocation = new Map<string, Doc<"riskPredictions">[]>();
  for (const p of all) {
    const list = byLocation.get(p.locationName) ?? [];
    list.push(p);
    byLocation.set(p.locationName, list);
  }

  const previous = new Map<string, Doc<"riskPredictions">>();
  for (const [location, list] of byLocation) {
    list.sort((a, b) => b.createdAt - a.createdAt);
    if (list.length > 1) previous.set(location, list[1]);
  }
  return previous;
}

/* --------------------------------------------------------- detectors */

/**
 * Operational insights for the selected window.
 *
 * Ordered by severity so the most consequential observation is first.
 */
export const getDecisionInsights = query({
  args: { window: timeWindow },
  handler: async (ctx, { window }) => {
    const now = Date.now();
    const from = windowStart(window as TimeWindowKey, now);

    const [predictions, incidents, roads, vehicles, deliveries] =
      await Promise.all([
        ctx.db.query("riskPredictions").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
      ]);

    const insights: Insight[] = [];

    /* ------------------------------- 1. districts with rising risk */
    const latest = latestPerLocation(predictions);
    const previous = previousPerLocation(predictions);

    const RISE_THRESHOLD = 8;
    const risingByDistrict = new Map<
      string,
      { state: string; delta: number; from: number; to: number; where: string }
    >();

    for (const [location, current] of latest) {
      const before = previous.get(location);
      if (!before) continue;
      const delta = current.riskScore - before.riskScore;
      if (delta < RISE_THRESHOLD) continue;

      const existing = risingByDistrict.get(current.district);
      if (!existing || delta > existing.delta) {
        risingByDistrict.set(current.district, {
          state: current.state,
          delta,
          from: before.riskScore,
          to: current.riskScore,
          where: location,
        });
      }
    }

    for (const [district, info] of risingByDistrict) {
      insights.push({
        code: "rising_district_risk",
        severity: info.to >= 76 ? "critical" : info.to >= 51 ? "high" : "medium",
        title: `Risk rising in ${district}`,
        detail: `Forecast risk at ${info.where} moved from ${info.from} to ${info.to} out of 100 (+${Math.round(info.delta)}) between the last two assessments.`,
        rule: `Fires when a location's score rises by ${RISE_THRESHOLD} or more since the previous assessment.`,
        affected: { district, state: info.state },
      });
    }

    /* --------------------------- 2. corridors disrupted repeatedly */
    const REPEAT_THRESHOLD = 2;
    const incidentsByRoad = new Map<string, Doc<"incidents">[]>();
    for (const incident of incidents) {
      if (!incident.roadId) continue;
      if (incident.createdAt < from) continue;
      const list = incidentsByRoad.get(incident.roadId) ?? [];
      list.push(incident);
      incidentsByRoad.set(incident.roadId, list);
    }

    for (const [roadId, list] of incidentsByRoad) {
      if (list.length < REPEAT_THRESHOLD) continue;
      const road = roads.find((r) => r._id === roadId);
      if (!road) continue;

      insights.push({
        code: "repeat_route_disruption",
        severity: list.length >= 3 ? "high" : "medium",
        title: `${road.roadNumber} disrupted ${list.length} times`,
        detail: `${road.roadName} in ${road.district} has recorded ${list.length} incidents in this window. Repeated failure on one corridor points at a structural problem rather than bad luck.`,
        rule: `Fires when a corridor records ${REPEAT_THRESHOLD} or more incidents inside the selected window.`,
        affected: {
          roadNumber: road.roadNumber,
          district: road.district,
          state: road.state,
        },
      });
    }

    /* ------------------------------- 3. unusual incident clustering */
    const windowIncidents = incidents.filter((i) => i.createdAt >= from);
    const countByDistrict = new Map<string, number>();
    for (const incident of windowIncidents) {
      countByDistrict.set(
        incident.district,
        (countByDistrict.get(incident.district) ?? 0) + 1,
      );
    }

    const counts = [...countByDistrict.values()].sort((a, b) => a - b);
    const median =
      counts.length === 0
        ? 0
        : counts[Math.floor(counts.length / 2)];

    for (const [district, count] of countByDistrict) {
      if (median === 0 || count < median * 2 || count < 2) continue;
      const sample = windowIncidents.find((i) => i.district === district);
      insights.push({
        code: "incident_cluster",
        severity: count >= 4 ? "high" : "medium",
        title: `Incident cluster in ${district}`,
        detail: `${count} incidents reported in ${district} against a regional median of ${median} per district in this window.`,
        rule: "Fires when a district's incident count is at least twice the regional median and at least 2.",
        affected: { district, state: sample?.state },
      });
    }

    /* ------------------------------ 4. delivery performance falling */
    const activeDeliveries = deliveries.filter(
      (d) => d.status === "in_transit" || d.status === "delayed",
    );
    const delayed = activeDeliveries.filter((d) => d.status === "delayed");
    const delayRatio =
      activeDeliveries.length === 0
        ? 0
        : delayed.length / activeDeliveries.length;

    if (activeDeliveries.length >= 3 && delayRatio >= 0.3) {
      insights.push({
        code: "delivery_degradation",
        severity: delayRatio >= 0.6 ? "critical" : "high",
        title: "Delivery performance degrading",
        detail: `${delayed.length} of ${activeDeliveries.length} in-flight consignments are delayed (${Math.round(delayRatio * 100)}%).`,
        rule: "Fires when 30% or more of in-flight consignments are delayed, with at least 3 in flight.",
      });
    }

    /* ------------------------------------- 5. idle or offline capacity */
    const idleOrOffline = vehicles.filter(
      (v) => v.status === "idle" || v.status === "offline",
    );
    const idleRatio =
      vehicles.length === 0 ? 0 : idleOrOffline.length / vehicles.length;

    if (vehicles.length >= 5 && idleRatio >= 0.3) {
      insights.push({
        code: "idle_capacity",
        severity: "medium",
        title: "Fleet capacity underused",
        detail: `${idleOrOffline.length} of ${vehicles.length} vehicles are idle or offline (${Math.round(idleRatio * 100)}%) while ${delayed.length} consignment(s) are delayed.`,
        rule: "Fires when 30% or more of the fleet is idle or offline, with a fleet of at least 5.",
      });
    }

    /* --------------- 6. blocked corridor carrying a priority load */
    const blockedRoads = roads.filter(
      (r) => r.accessibilityStatus === "blocked",
    );
    const priorityDeliveries = deliveries.filter(
      (d) =>
        (d.priority === "critical" || d.priority === "emergency") &&
        d.status !== "delivered" &&
        d.status !== "cancelled",
    );

    if (blockedRoads.length > 0 && priorityDeliveries.length > 0) {
      const road = blockedRoads[0];
      insights.push({
        code: "blocked_corridor_with_priority_load",
        severity: "critical",
        title: `${blockedRoads.length} corridor(s) blocked with priority cargo in flight`,
        detail: `${priorityDeliveries.length} critical or emergency consignment(s) are moving while ${blockedRoads.length} corridor(s) — including ${road.roadNumber} in ${road.district} — are closed to traffic.`,
        rule: "Fires when any corridor is blocked while a critical or emergency consignment is undelivered.",
        affected: {
          roadNumber: road.roadNumber,
          district: road.district,
          state: road.state,
        },
      });
    }

    const rank: Record<InsightSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return {
      window,
      generatedAt: now,
      method: "deterministic-rules-v1",
      insights: insights.sort(
        (a, b) => rank[b.severity] - rank[a.severity],
      ),
    };
  },
});

/* --------------------------------------------------- recommendations */

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  code: string;
  priority: RecommendationPriority;
  action: string;
  reason: string;
  affected?: {
    district?: string;
    roadNumber?: string;
    vehicleNumber?: string;
    count?: number;
  };
}

/**
 * Actionable recommendations derived from current state.
 *
 * Each carries the observation that produced it, so an operator can disagree
 * with the recommendation on the evidence rather than on trust.
 */
export const getRecommendations = query({
  args: { window: timeWindow },
  handler: async (ctx, { window }) => {
    const now = Date.now();
    const from = windowStart(window as TimeWindowKey, now);

    const [roads, incidents, vehicles, deliveries, alerts, predictions] =
      await Promise.all([
        ctx.db.query("roads").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("riskPredictions").collect(),
      ]);

    const recommendations: Recommendation[] = [];
    const latest = [...latestPerLocation(predictions).values()];

    /* ---------------------------- reroute off blocked corridors */
    const blocked = roads.filter((r) => r.accessibilityStatus === "blocked");
    for (const road of blocked) {
      const priorityLoads = deliveries.filter(
        (d) =>
          (d.priority === "critical" || d.priority === "emergency") &&
          d.status !== "delivered" &&
          d.status !== "cancelled",
      ).length;

      recommendations.push({
        code: "reroute_blocked",
        priority: priorityLoads > 0 ? "critical" : "high",
        action: `Re-route traffic off ${road.roadNumber} and publish the alternative corridor to operators.`,
        reason: `${road.roadName} in ${road.district} is blocked (risk ${Math.round(road.riskScore)}/100)${priorityLoads > 0 ? ` while ${priorityLoads} priority consignment(s) are undelivered` : ""}.`,
        affected: {
          roadNumber: road.roadNumber,
          district: road.district,
          count: priorityLoads,
        },
      });
    }

    /* --------------------- deploy field officers to hot districts */
    const windowIncidents = incidents.filter((i) => i.createdAt >= from);
    const byDistrict = new Map<string, number>();
    for (const incident of windowIncidents) {
      byDistrict.set(
        incident.district,
        (byDistrict.get(incident.district) ?? 0) + 1,
      );
    }
    const hottest = [...byDistrict.entries()].sort((a, b) => b[1] - a[1])[0];
    if (hottest && hottest[1] >= 2) {
      recommendations.push({
        code: "deploy_field_officers",
        priority: hottest[1] >= 4 ? "high" : "medium",
        action: `Deploy additional field officers to ${hottest[0]}.`,
        reason: `${hottest[1]} incidents reported in ${hottest[0]} during this window — the highest of any district.`,
        affected: { district: hottest[0], count: hottest[1] },
      });
    }

    /* ------------------------------ prioritise critical deliveries */
    const delayedPriority = deliveries.filter(
      (d) =>
        d.status === "delayed" &&
        (d.priority === "critical" || d.priority === "emergency"),
    );
    if (delayedPriority.length > 0) {
      const sample = delayedPriority[0];
      const vehicle = vehicles.find((v) => v._id === sample.vehicleId);
      recommendations.push({
        code: "prioritise_critical_delivery",
        priority: "critical",
        action: `Escalate ${delayedPriority.length} delayed priority consignment(s) — reassign or clear a corridor.`,
        reason: `${delayedPriority.length} critical or emergency load(s) are delayed, including ${sample.cargoType} to ${sample.destination}.`,
        affected: {
          vehicleNumber: vehicle?.vehicleNumber,
          count: delayedPriority.length,
        },
      });
    }

    /* -------------------------- increase monitoring where risk high */
    const elevated = latest.filter(
      (p) => RISK_RANK[p.riskLevel] >= RISK_RANK.high,
    );
    for (const prediction of elevated.slice(0, 3)) {
      recommendations.push({
        code: "increase_monitoring",
        priority: prediction.riskLevel === "critical" ? "high" : "medium",
        action: `Increase monitoring around ${prediction.locationName}, ${prediction.district}.`,
        reason: `${prediction.predictedIssue} forecast at ${Math.round(prediction.riskScore)}/100 with ${Math.round(prediction.confidence)}% confidence.`,
        affected: { district: prediction.district },
      });
    }

    /* ------------------- investigate repeatedly disrupted corridors */
    const incidentsByRoad = new Map<string, number>();
    for (const incident of windowIncidents) {
      if (!incident.roadId) continue;
      incidentsByRoad.set(
        incident.roadId,
        (incidentsByRoad.get(incident.roadId) ?? 0) + 1,
      );
    }
    for (const [roadId, count] of incidentsByRoad) {
      if (count < 2) continue;
      const road = roads.find((r) => r._id === roadId);
      if (!road) continue;
      recommendations.push({
        code: "investigate_repeat_disruption",
        priority: "medium",
        action: `Commission a structural inspection of ${road.roadNumber} in ${road.district}.`,
        reason: `${count} separate incidents on the same corridor in this window suggests a persistent defect rather than isolated events.`,
        affected: { roadNumber: road.roadNumber, district: road.district, count },
      });
    }

    /* ----------------------------- clear unacknowledged criticals */
    const unacknowledged = alerts.filter(
      (a) => a.status === "active" && a.severity === "critical",
    );
    if (unacknowledged.length >= 3) {
      recommendations.push({
        code: "acknowledge_alerts",
        priority: "high",
        action: `Triage ${unacknowledged.length} unacknowledged critical alerts.`,
        reason:
          "Unacknowledged criticals mean nobody has formally taken ownership of the situation.",
        affected: { count: unacknowledged.length },
      });
    }

    const rank: Record<RecommendationPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return {
      window,
      generatedAt: now,
      method: "deterministic-rules-v1",
      recommendations: recommendations.sort(
        (a, b) => rank[b.priority] - rank[a.priority],
      ),
    };
  },
});

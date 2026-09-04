import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DAY, haversineKm, RISK_RANK, SEVERITY_RANK } from "./lib/helpers";

/**
 * Situation briefing.
 *
 * Composes the current picture from the engines that already exist — risk,
 * fleet, incidents, alerts — into four sections an operator can read in ten
 * seconds.
 *
 * The three kinds of statement are kept structurally separate rather than
 * blended into prose, because conflating them is how a briefing misleads:
 *
 * - `observations` are facts read from the database.
 * - `risks` are forecasts from the rule engine, never stated as fact.
 * - `recommendations` are suggested actions awaiting human approval.
 *
 * The UI renders each group under its own labelled heading for the same
 * reason.
 */

interface BriefingLine {
  text: string;
  /** Entity this line is about, for the UI to link. */
  entity?: string;
  severity?: "critical" | "high" | "medium" | "low";
}

function latestPredictions(all: Doc<"riskPredictions">[]) {
  const latest = new Map<string, Doc<"riskPredictions">>();
  for (const p of all) {
    const seen = latest.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
  }
  return [...latest.values()];
}

export const getSituationBriefing = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const [incidents, roads, vehicles, deliveries, alerts, predictionsAll] =
      await Promise.all([
        ctx.db.query("incidents").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("riskPredictions").collect(),
      ]);

    const predictions = latestPredictions(predictionsAll);
    const activeIncidents = incidents.filter((i) => i.status === "active");
    const blocked = roads.filter((r) => r.accessibilityStatus === "blocked");
    const restricted = roads.filter(
      (r) => r.accessibilityStatus === "restricted",
    );
    const criticalAlerts = alerts.filter(
      (a) => a.status === "active" && a.severity === "critical",
    );
    const movingVehicles = vehicles.filter(
      (v) => v.status === "active" || v.status === "emergency",
    );
    const delayedDeliveries = deliveries.filter((d) => d.status === "delayed");
    const priorityDelayed = delayedDeliveries.filter(
      (d) => d.priority === "critical" || d.priority === "emergency",
    );

    /* ------------------------------------------------ current situation */
    const observations: BriefingLine[] = [
      {
        text: `${movingVehicles.length} of ${vehicles.length} vehicles are moving across the region.`,
      },
      {
        text: `${roads.length - blocked.length - restricted.length} of ${roads.length} corridors are fully open; ${restricted.length} restricted, ${blocked.length} blocked.`,
        severity: blocked.length > 0 ? "critical" : undefined,
      },
      {
        text: `${activeIncidents.length} incident${activeIncidents.length === 1 ? "" : "s"} active, ${activeIncidents.filter((i) => i.severity === "critical").length} at critical severity.`,
        severity:
          activeIncidents.some((i) => i.severity === "critical")
            ? "critical"
            : undefined,
      },
      {
        text: `${deliveries.filter((d) => d.status === "in_transit" || d.status === "delayed").length} consignments in flight, ${delayedDeliveries.length} delayed.`,
        severity: priorityDelayed.length > 0 ? "high" : undefined,
      },
    ];

    for (const incident of [...activeIncidents]
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
      .slice(0, 3)) {
      observations.push({
        text: `${incident.severity.toUpperCase()}: ${incident.incidentType.replace(/_/g, " ")} at ${incident.locationName}, ${incident.district}${incident.verified ? " (verified)" : " (unverified report)"}.`,
        entity: incident.locationName,
        severity: incident.severity === "medium" ? "medium" : incident.severity,
      });
    }

    /* --------------------------------------------------------- key risks */
    const elevated = predictions
      .filter((p) => RISK_RANK[p.riskLevel] >= RISK_RANK.high)
      .sort((a, b) => b.riskScore - a.riskScore);

    const risks: BriefingLine[] = elevated.slice(0, 4).map((p) => ({
      text: `${p.predictedIssue} forecast at ${p.locationName}, ${p.district} — ${Math.round(p.riskScore)}/100 at ${Math.round(p.confidence)}% confidence.`,
      entity: p.locationName,
      severity: p.riskLevel === "critical" ? "critical" : "high",
    }));

    if (risks.length === 0) {
      risks.push({
        text: "No location is currently forecast in the high or critical risk band.",
      });
    }

    /* ----------------------------------------------- affected operations */
    const affected: BriefingLine[] = [];

    for (const road of blocked.slice(0, 3)) {
      affected.push({
        text: `${road.roadNumber} ${road.roadName} is closed to traffic in ${road.district}.`,
        entity: road.roadNumber,
        severity: "critical",
      });
    }

    // Vehicles within 25 km of an active incident, straight-line.
    const exposedVehicles = vehicles.filter((vehicle) =>
      activeIncidents.some(
        (incident) =>
          haversineKm(
            vehicle.latitude,
            vehicle.longitude,
            incident.latitude,
            incident.longitude,
          ) <= 25,
      ),
    );

    if (exposedVehicles.length > 0) {
      affected.push({
        text: `${exposedVehicles.length} vehicle(s) are within 25 km of an active incident, including ${exposedVehicles
          .slice(0, 3)
          .map((v) => v.vehicleNumber)
          .join(", ")}.`,
        severity: "high",
      });
    }

    for (const delivery of priorityDelayed.slice(0, 3)) {
      affected.push({
        text: `${delivery.priority.toUpperCase()} ${delivery.cargoType} consignment to ${delivery.destination} is delayed.`,
        severity: "critical",
      });
    }

    if (affected.length === 0) {
      affected.push({ text: "No operation is currently disrupted." });
    }

    /* -------------------------------------------------------- next steps */
    const recommendations: BriefingLine[] = [];

    if (blocked.length > 0) {
      recommendations.push({
        text: `Re-route traffic off ${blocked.map((r) => r.roadNumber).join(", ")} and publish the alternative corridor.`,
        severity: "critical",
      });
    }
    if (priorityDelayed.length > 0) {
      recommendations.push({
        text: `Escalate ${priorityDelayed.length} delayed priority consignment(s) — reassign or clear a corridor.`,
        severity: "critical",
      });
    }
    if (criticalAlerts.length >= 3) {
      recommendations.push({
        text: `Triage ${criticalAlerts.length} unacknowledged critical alerts.`,
        severity: "high",
      });
    }
    for (const p of elevated.slice(0, 2)) {
      recommendations.push({ text: p.recommendedAction, severity: "high" });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        text: "Continue routine monitoring. Nothing currently requires escalation.",
      });
    }

    const headline =
      blocked.length > 0
        ? `${blocked.length} corridor(s) closed — ${activeIncidents.length} incident(s) active`
        : activeIncidents.length > 0
          ? `${activeIncidents.length} incident(s) active, network open`
          : "Network open, no active incidents";

    return {
      generatedAt: now,
      headline,
      /** Which engine produced this — never claims to be an LLM. */
      method: "deterministic-composition-v1",
      observations,
      risks,
      affected,
      recommendations,
      counts: {
        activeIncidents: activeIncidents.length,
        blockedRoads: blocked.length,
        restrictedRoads: restricted.length,
        criticalAlerts: criticalAlerts.length,
        movingVehicles: movingVehicles.length,
        totalVehicles: vehicles.length,
        delayedDeliveries: delayedDeliveries.length,
        priorityDelayed: priorityDelayed.length,
        incidentsLast24h: incidents.filter((i) => i.createdAt >= now - DAY)
          .length,
      },
    };
  },
});

/* ------------------------------------------------- emergency briefing */

/**
 * Emergency situation summary.
 *
 * Emergency mode is derived, not toggled: the region is in an emergency
 * posture when a corridor is closed, a critical incident is open, or an
 * emergency vehicle is deployed. Basing it on real conditions means it
 * cannot be left switched on by accident after the situation clears.
 */
export const getEmergencyBriefing = query({
  args: {},
  handler: async (ctx) => {
    const [incidents, roads, vehicles, deliveries, alerts, predictionsAll] =
      await Promise.all([
        ctx.db.query("incidents").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("riskPredictions").collect(),
      ]);

    const predictions = latestPredictions(predictionsAll);
    const activeIncidents = incidents.filter((i) => i.status === "active");
    const criticalIncidents = activeIncidents.filter(
      (i) => i.severity === "critical",
    );
    const blocked = roads.filter((r) => r.accessibilityStatus === "blocked");
    const emergencyVehicles = vehicles.filter(
      (v) => v.status === "emergency",
    );
    const availableVehicles = vehicles.filter(
      (v) => v.status === "idle" || v.status === "active",
    );
    const priorityLoads = deliveries.filter(
      (d) =>
        (d.priority === "critical" || d.priority === "emergency") &&
        d.status !== "delivered" &&
        d.status !== "cancelled",
    );
    const criticalAlerts = alerts.filter(
      (a) => a.status === "active" && a.severity === "critical",
    );

    const active =
      blocked.length > 0 ||
      criticalIncidents.length > 0 ||
      emergencyVehicles.length > 0;

    // Severity scales with how many independent signals are firing.
    const signals = [
      blocked.length > 0,
      criticalIncidents.length > 0,
      criticalAlerts.length >= 3,
      priorityLoads.some((d) => d.status === "delayed"),
    ].filter(Boolean).length;

    const severity: "none" | "elevated" | "major" | "severe" = !active
      ? "none"
      : signals >= 3
        ? "severe"
        : signals === 2
          ? "major"
          : "elevated";

    // Districts touched by a critical incident, a closure or a critical forecast.
    const affectedDistricts = new Set<string>();
    for (const i of criticalIncidents) affectedDistricts.add(i.district);
    for (const r of blocked) affectedDistricts.add(r.district);
    for (const p of predictions) {
      if (p.riskLevel === "critical") affectedDistricts.add(p.district);
    }

    const actions: string[] = [];
    if (blocked.length > 0) {
      actions.push(
        `Confirm clearance ETA for ${blocked.map((r) => r.roadNumber).join(", ")} with the road agency.`,
      );
      actions.push(
        "Activate the alternative corridor and notify every operator with an active consignment.",
      );
    }
    if (priorityLoads.length > 0) {
      actions.push(
        `Give movement priority to ${priorityLoads.length} critical/emergency consignment(s).`,
      );
    }
    if (criticalIncidents.length > 0) {
      actions.push(
        `Dispatch assessment teams to ${criticalIncidents.map((i) => i.locationName).join(", ")}.`,
      );
    }
    if (emergencyVehicles.length === 0 && active) {
      actions.push(
        "No emergency-status vehicle is deployed — consider assigning one from available capacity.",
      );
    }
    if (actions.length === 0) {
      actions.push("No emergency response action required.");
    }

    return {
      active,
      severity,
      generatedAt: Date.now(),
      method: "deterministic-composition-v1",
      summary: active
        ? `${severity.toUpperCase()} — ${blocked.length} corridor(s) closed, ${criticalIncidents.length} critical incident(s), ${affectedDistricts.size} district(s) affected.`
        : "No emergency conditions detected across the monitored region.",
      affectedDistricts: [...affectedDistricts].sort(),
      criticalIncidents: criticalIncidents.map((i) => ({
        _id: i._id,
        type: i.incidentType,
        locationName: i.locationName,
        district: i.district,
        state: i.state,
        verified: i.verified,
        createdAt: i.createdAt,
      })),
      blockedRoads: blocked.map((r) => ({
        _id: r._id,
        roadNumber: r.roadNumber,
        roadName: r.roadName,
        district: r.district,
        riskScore: r.riskScore,
      })),
      resources: {
        emergencyVehicles: emergencyVehicles.map((v) => ({
          _id: v._id,
          vehicleNumber: v.vehicleNumber,
          cargoType: v.cargoType,
          destination: v.destination,
          driverName: v.driverName,
        })),
        availableVehicles: availableVehicles.length,
        priorityLoads: priorityLoads.length,
        delayedPriorityLoads: priorityLoads.filter(
          (d) => d.status === "delayed",
        ).length,
      },
      criticalAlerts: criticalAlerts.length,
      recommendedActions: actions,
    };
  },
});

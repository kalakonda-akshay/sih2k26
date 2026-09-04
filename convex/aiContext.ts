import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DAY, RISK_RANK, SEVERITY_RANK } from "./lib/helpers";

/**
 * Structured context for the AI layer.
 *
 * ## Why this exists
 *
 * The model never touches the database. It receives only this bounded,
 * pre-selected summary — a few dozen rows chosen by deterministic rules,
 * never the whole table. That gives three things at once:
 *
 * - **Grounding.** Every fact the model can state is one it was handed. It
 *   has no channel through which to invent a vehicle or a road.
 * - **Cost control.** The payload is capped by construction, so prompt size
 *   does not grow with the fleet.
 * - **Least privilege.** There is no tool that runs arbitrary queries, so a
 *   prompt injection in an incident description cannot reach the database.
 *
 * Caps are deliberately small. If a section is truncated the payload says so,
 * and the model is instructed to surface that rather than imply completeness.
 */

const CAPS = {
  incidents: 8,
  roads: 8,
  vehicles: 8,
  deliveries: 6,
  alerts: 6,
  predictions: 6,
  districts: 6,
} as const;

function latestPredictions(all: Doc<"riskPredictions">[]) {
  const latest = new Map<string, Doc<"riskPredictions">>();
  for (const p of all) {
    const seen = latest.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
  }
  return [...latest.values()];
}

export const getContext = query({
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

    /* ------------------------------------------------------- incidents */
    const activeIncidents = incidents
      .filter((i) => i.status === "active")
      .sort((a, b) => {
        const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        return s !== 0 ? s : b.createdAt - a.createdAt;
      });

    /* ----------------------------------------------------------- roads */
    const notableRoads = roads
      .filter(
        (r) =>
          r.accessibilityStatus !== "accessible" ||
          r.riskLevel === "high" ||
          r.riskLevel === "critical",
      )
      .sort((a, b) => b.riskScore - a.riskScore);

    /* -------------------------------------------------------- vehicles */
    const notableVehicles = vehicles
      .filter(
        (v) =>
          v.status === "delayed" ||
          v.status === "emergency" ||
          RISK_RANK[v.riskLevel] >= RISK_RANK.high,
      )
      .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]);

    /* ------------------------------------------------------ deliveries */
    const notableDeliveries = deliveries
      .filter(
        (d) =>
          d.status === "delayed" ||
          ((d.priority === "critical" || d.priority === "emergency") &&
            d.status !== "delivered" &&
            d.status !== "cancelled"),
      )
      .sort((a, b) => a.estimatedArrival - b.estimatedArrival);

    /* ---------------------------------------------------------- alerts */
    const activeAlerts = alerts
      .filter((a) => a.status === "active")
      .sort((a, b) => {
        const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        return s !== 0 ? s : b.createdAt - a.createdAt;
      });

    /* ----------------------------------------------------- predictions */
    const elevated = predictions
      .filter((p) => RISK_RANK[p.riskLevel] >= RISK_RANK.high)
      .sort((a, b) => b.riskScore - a.riskScore);

    /* ------------------------------------------------------- districts */
    const byDistrict = new Map<
      string,
      { district: string; state: string; risk: number[]; incidents: number }
    >();
    for (const p of predictions) {
      const row = byDistrict.get(p.district) ?? {
        district: p.district,
        state: p.state,
        risk: [],
        incidents: 0,
      };
      row.risk.push(p.riskScore);
      byDistrict.set(p.district, row);
    }
    for (const i of activeIncidents) {
      const row = byDistrict.get(i.district);
      if (row) row.incidents += 1;
    }
    const districts = [...byDistrict.values()]
      .map((r) => ({
        district: r.district,
        state: r.state,
        averageRisk: Math.round(
          r.risk.reduce((a, b) => a + b, 0) / Math.max(r.risk.length, 1),
        ),
        activeIncidents: r.incidents,
      }))
      .sort((a, b) => b.averageRisk - a.averageRisk);

    const truncated: string[] = [];
    const cap = <T>(rows: T[], limit: number, label: string): T[] => {
      if (rows.length > limit) {
        truncated.push(
          `${label}: showing ${limit} of ${rows.length}`,
        );
      }
      return rows.slice(0, limit);
    };

    return {
      generatedAt: now,

      totals: {
        vehicles: vehicles.length,
        movingVehicles: vehicles.filter(
          (v) => v.status === "active" || v.status === "emergency",
        ).length,
        roads: roads.length,
        blockedRoads: roads.filter((r) => r.accessibilityStatus === "blocked")
          .length,
        restrictedRoads: roads.filter(
          (r) => r.accessibilityStatus === "restricted",
        ).length,
        activeIncidents: activeIncidents.length,
        incidentsLast24h: incidents.filter((i) => i.createdAt >= now - DAY)
          .length,
        activeAlerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter((a) => a.severity === "critical")
          .length,
        activeDeliveries: deliveries.filter(
          (d) => d.status === "in_transit" || d.status === "delayed",
        ).length,
        delayedDeliveries: deliveries.filter((d) => d.status === "delayed")
          .length,
      },

      incidents: cap(activeIncidents, CAPS.incidents, "incidents").map((i) => ({
        type: i.incidentType,
        severity: i.severity,
        location: i.locationName,
        district: i.district,
        state: i.state,
        verified: i.verified,
        ageMinutes: Math.round((now - i.createdAt) / 60000),
      })),

      roads: cap(notableRoads, CAPS.roads, "roads").map((r) => ({
        roadNumber: r.roadNumber,
        roadName: r.roadName,
        district: r.district,
        accessibility: r.accessibilityStatus,
        riskScore: Math.round(r.riskScore),
        riskLevel: r.riskLevel,
      })),

      vehicles: cap(notableVehicles, CAPS.vehicles, "vehicles").map((v) => ({
        vehicleNumber: v.vehicleNumber,
        cargoType: v.cargoType,
        status: v.status,
        riskLevel: v.riskLevel,
        destination: v.destination,
      })),

      deliveries: cap(notableDeliveries, CAPS.deliveries, "deliveries").map(
        (d) => ({
          cargoType: d.cargoType,
          priority: d.priority,
          status: d.status,
          origin: d.origin,
          destination: d.destination,
          overdue: d.estimatedArrival < now && d.status !== "delivered",
        }),
      ),

      alerts: cap(activeAlerts, CAPS.alerts, "alerts").map((a) => ({
        title: a.title,
        severity: a.severity,
        type: a.alertType,
        location: a.locationName ?? null,
        recommendedAction: a.recommendedAction,
      })),

      predictions: cap(elevated, CAPS.predictions, "predictions").map((p) => ({
        location: p.locationName,
        district: p.district,
        riskScore: Math.round(p.riskScore),
        riskLevel: p.riskLevel,
        predictedIssue: p.predictedIssue,
        confidence: Math.round(p.confidence),
        topFactors: [...p.contributingFactors]
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map((f) => `${f.factor} (+${f.weight})`),
      })),

      districts: cap(districts, CAPS.districts, "districts"),

      /** Sections that were cut — the model must not imply completeness. */
      truncated,
    };
  },
});

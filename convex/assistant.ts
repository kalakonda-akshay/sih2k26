import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DAY, haversineKm, RISK_RANK, SEVERITY_RANK } from "./lib/helpers";
import {
  classifyIntent,
  SUGGESTED_QUESTIONS,
  type AffectedEntity,
  type AssistantAnswer,
} from "./lib/intents";

/**
 * Operations assistant.
 *
 * Answers a fixed set of operational questions from live Convex data. The
 * classifier is keyword-based (see `lib/intents.ts`) — it is not natural
 * language understanding, and it says so when a question falls outside what
 * it handles rather than guessing.
 *
 * Every figure in every answer is read from the database at query time. The
 * assistant cannot invent an incident, a vehicle or a statistic, because it
 * has no generative step: it selects and formats real rows.
 */

interface World {
  incidents: Doc<"incidents">[];
  roads: Doc<"roads">[];
  vehicles: Doc<"vehicles">[];
  deliveries: Doc<"deliveries">[];
  alerts: Doc<"alerts">[];
  predictions: Doc<"riskPredictions">[];
  activity: Doc<"activityLog">[];
}

function latestPredictions(all: Doc<"riskPredictions">[]) {
  const latest = new Map<string, Doc<"riskPredictions">>();
  for (const p of all) {
    const seen = latest.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
  }
  return [...latest.values()];
}

const NO_DATA = "Insufficient data available in the current intelligence system.";

/** Ask the assistant a question. */
export const ask = query({
  args: { question: v.string() },
  handler: async (ctx, { question }): Promise<AssistantAnswer> => {
    const match = classifyIntent(question);

    if (match.intent === "unsupported") {
      return {
        intent: "unsupported",
        answer:
          "I could not map that question to an operation I can answer from the data I hold. I handle questions about incidents, roads, vehicles, deliveries, district risk, recent changes and current priorities.",
        summary: "Question not recognised.",
        observations: [],
        risks: [],
        recommendations: [],
        affectedEntities: [],
        confidence: 0,
        limitations: [
          "This assistant matches keywords against a fixed set of operational questions. It does not interpret free-form language.",
          `Try one of: ${SUGGESTED_QUESTIONS.slice(0, 3).join(" · ")}`,
        ],
        source: "deterministic",
      };
    }

    const [incidents, roads, vehicles, deliveries, alerts, predictions, activity] =
      await Promise.all([
        ctx.db.query("incidents").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("alerts").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db
          .query("activityLog")
          .withIndex("by_createdAt")
          .order("desc")
          .take(200),
      ]);

    const world: World = {
      incidents,
      roads,
      vehicles,
      deliveries,
      alerts,
      predictions: latestPredictions(predictions),
      activity,
    };

    const answer = answerFor(match.intent, world);

    return {
      ...answer,
      intent: match.intent,
      confidence: Math.min(match.confidence, answer.confidence),
      source: "deterministic",
    };
  },
});

/** The suggestion chips shown under the input. */
export const getSuggestions = query({
  args: {},
  handler: async () => SUGGESTED_QUESTIONS,
});

/* ------------------------------------------------------------ answers */

type PartialAnswer = Omit<AssistantAnswer, "intent" | "source">;

function answerFor(
  intent: Exclude<AssistantAnswer["intent"], "unsupported">,
  w: World,
): PartialAnswer {
  switch (intent) {
    case "highest_risk_district":
      return highestRiskDistrict(w);
    case "active_incidents":
      return activeIncidents(w, false);
    case "critical_incidents":
      return activeIncidents(w, true);
    case "blocked_roads":
      return blockedRoads(w);
    case "high_risk_roads":
      return highRiskRoads(w);
    case "delayed_vehicles":
      return delayedVehicles(w);
    case "high_risk_vehicles":
      return highRiskVehicles(w);
    case "emergency_vehicles":
      return emergencyVehicles(w);
    case "critical_deliveries":
      return criticalDeliveries(w);
    case "delayed_deliveries":
      return delayedDeliveries(w);
    case "priorities":
      return priorities(w);
    case "recent_changes":
      return recentChanges(w);
    case "operational_health":
    case "situation_summary":
      return situationSummary(w);
  }
}

const empty = (summary: string, note: string): PartialAnswer => ({
  answer: NO_DATA,
  summary,
  observations: [note],
  risks: [],
  recommendations: [],
  affectedEntities: [],
  confidence: 60,
  limitations: ["No matching records exist in the database."],
});

function highestRiskDistrict(w: World): PartialAnswer {
  if (w.predictions.length === 0) {
    return empty("No risk assessment available.", "The risk engine has not run yet.");
  }

  const byDistrict = new Map<string, { total: number; n: number; state: string }>();
  for (const p of w.predictions) {
    const entry = byDistrict.get(p.district) ?? { total: 0, n: 0, state: p.state };
    entry.total += p.riskScore;
    entry.n += 1;
    byDistrict.set(p.district, entry);
  }

  const ranked = [...byDistrict.entries()]
    .map(([district, e]) => ({
      district,
      state: e.state,
      avg: Math.round(e.total / e.n),
    }))
    .sort((a, b) => b.avg - a.avg);

  const top = ranked[0];
  const worstLocation = w.predictions
    .filter((p) => p.district === top.district)
    .sort((a, b) => b.riskScore - a.riskScore)[0];

  return {
    answer: `${top.district} (${top.state}) currently carries the highest forecast risk, averaging ${top.avg}/100 across its monitored locations.`,
    summary: `${top.district} — average risk ${top.avg}/100.`,
    observations: [
      `${top.district} averages ${top.avg}/100 across ${byDistrict.get(top.district)!.n} monitored location(s).`,
      ...ranked
        .slice(1, 4)
        .map((r) => `${r.district}: ${r.avg}/100.`),
    ],
    risks: worstLocation
      ? [
          `${worstLocation.predictedIssue} forecast at ${worstLocation.locationName} scoring ${Math.round(worstLocation.riskScore)}/100 with ${Math.round(worstLocation.confidence)}% confidence.`,
        ]
      : [],
    recommendations: worstLocation
      ? [worstLocation.recommendedAction]
      : [],
    affectedEntities: [
      { kind: "district", label: top.district, detail: `${top.avg}/100 average risk` },
      ...(worstLocation
        ? [
            {
              kind: "district" as const,
              label: worstLocation.locationName,
              detail: worstLocation.predictedIssue,
            },
          ]
        : []),
    ],
    confidence: 90,
    limitations: [
      "Risk is a forecast from the rule engine, not a confirmed event.",
      "District averages weight every monitored location equally.",
    ],
  };
}

function activeIncidents(w: World, criticalOnly: boolean): PartialAnswer {
  let active = w.incidents.filter((i) => i.status === "active");
  if (criticalOnly) active = active.filter((i) => i.severity === "critical");

  if (active.length === 0) {
    return empty(
      criticalOnly ? "No critical incidents." : "No active incidents.",
      criticalOnly
        ? "No incident is currently at critical severity."
        : "No incident is currently active.",
    );
  }

  active.sort((a, b) => {
    const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    return s !== 0 ? s : b.createdAt - a.createdAt;
  });

  const label = criticalOnly ? "critical" : "active";

  return {
    answer: `There ${active.length === 1 ? "is" : "are"} ${active.length} ${label} incident${active.length === 1 ? "" : "s"} across the region. The most severe is a ${active[0].incidentType.replace(/_/g, " ")} at ${active[0].locationName}, ${active[0].district}.`,
    summary: `${active.length} ${label} incident${active.length === 1 ? "" : "s"}.`,
    observations: active
      .slice(0, 6)
      .map(
        (i) =>
          `${i.severity.toUpperCase()} — ${i.incidentType.replace(/_/g, " ")} at ${i.locationName}, ${i.district}${i.verified ? " (verified)" : " (unverified)"}.`,
      ),
    risks: [],
    recommendations:
      active.some((i) => i.severity === "critical")
        ? ["Confirm corridor closures around the critical incidents and re-route affected consignments."]
        : ["Monitor. No incident currently warrants a corridor closure."],
    affectedEntities: active.slice(0, 6).map((i) => ({
      kind: "incident" as const,
      label: `${i.incidentType.replace(/_/g, " ")} — ${i.locationName}`,
      detail: `${i.severity} · ${i.district}`,
    })),
    confidence: 95,
    limitations: [
      "Unverified reports are included and are marked as such.",
    ],
  };
}

function blockedRoads(w: World): PartialAnswer {
  const blocked = w.roads.filter((r) => r.accessibilityStatus === "blocked");
  const restricted = w.roads.filter(
    (r) => r.accessibilityStatus === "restricted",
  );

  if (blocked.length === 0) {
    return {
      answer: `No corridor is currently blocked. ${restricted.length} of ${w.roads.length} are under movement restrictions.`,
      summary: "No corridors blocked.",
      observations: restricted
        .slice(0, 5)
        .map(
          (r) =>
            `${r.roadNumber} ${r.roadName} (${r.district}) — restricted, risk ${Math.round(r.riskScore)}/100.`,
        ),
      risks: [],
      recommendations: ["No re-routing required for blockage at this time."],
      affectedEntities: [],
      confidence: 95,
      limitations: [],
    };
  }

  return {
    answer: `${blocked.length} corridor${blocked.length === 1 ? " is" : "s are"} blocked: ${blocked.map((r) => r.roadNumber).join(", ")}. A further ${restricted.length} are restricted.`,
    summary: `${blocked.length} blocked, ${restricted.length} restricted.`,
    observations: blocked.map(
      (r) =>
        `${r.roadNumber} ${r.roadName} — ${r.district}, ${r.state}. Risk ${Math.round(r.riskScore)}/100.`,
    ),
    risks: restricted
      .slice(0, 3)
      .map(
        (r) =>
          `${r.roadNumber} is restricted at risk ${Math.round(r.riskScore)}/100 and could degrade further.`,
      ),
    recommendations: [
      `Re-route traffic off ${blocked.map((r) => r.roadNumber).join(", ")} and publish the alternative corridors to operators.`,
    ],
    affectedEntities: blocked.map((r) => ({
      kind: "road" as const,
      label: r.roadNumber,
      detail: `${r.roadName} · ${r.district}`,
    })),
    confidence: 95,
    limitations: [],
  };
}

function highRiskRoads(w: World): PartialAnswer {
  const elevated = w.roads
    .filter((r) => r.riskLevel === "high" || r.riskLevel === "critical")
    .sort((a, b) => b.riskScore - a.riskScore);

  if (elevated.length === 0) {
    return empty("No high-risk corridors.", "Every corridor is currently below the high-risk threshold.");
  }

  return {
    answer: `${elevated.length} corridor${elevated.length === 1 ? "" : "s"} sit in the high or critical band. The worst is ${elevated[0].roadNumber} at ${Math.round(elevated[0].riskScore)}/100.`,
    summary: `${elevated.length} corridor(s) at elevated risk.`,
    observations: elevated
      .slice(0, 6)
      .map(
        (r) =>
          `${r.roadNumber} ${r.roadName} (${r.district}) — ${Math.round(r.riskScore)}/100, ${r.accessibilityStatus}.`,
      ),
    risks: [
      "Corridor risk scores are forecasts from the rule engine and can change with rainfall.",
    ],
    recommendations: [
      "Restrict heavy vehicles on critical-band corridors and pre-position clearing equipment.",
    ],
    affectedEntities: elevated.slice(0, 6).map((r) => ({
      kind: "road" as const,
      label: r.roadNumber,
      detail: `${Math.round(r.riskScore)}/100 · ${r.district}`,
    })),
    confidence: 90,
    limitations: ["Scores are predictive, not observed closures."],
  };
}

function delayedVehicles(w: World): PartialAnswer {
  const delayed = w.vehicles.filter((v) => v.status === "delayed");

  if (delayed.length === 0) {
    return empty("No delayed vehicles.", "Every vehicle is running or idle by plan.");
  }

  return {
    answer: `${delayed.length} vehicle${delayed.length === 1 ? " is" : "s are"} delayed.`,
    summary: `${delayed.length} vehicle(s) delayed.`,
    observations: delayed
      .slice(0, 8)
      .map(
        (v) =>
          `${v.vehicleNumber} — ${v.cargoType} to ${v.destination}, risk band ${v.riskLevel}.`,
      ),
    risks: [],
    recommendations: [
      "Check whether each delayed vehicle is held by a corridor closure and re-route where an alternative exists.",
    ],
    affectedEntities: delayed.slice(0, 8).map((v) => ({
      kind: "vehicle" as const,
      label: v.vehicleNumber,
      detail: `${v.cargoType} → ${v.destination}`,
    })),
    confidence: 95,
    limitations: [],
  };
}

function highRiskVehicles(w: World): PartialAnswer {
  const activeIncidentPoints = w.incidents.filter((i) => i.status === "active");

  const exposed = w.vehicles
    .map((vehicle) => {
      const nearest = activeIncidentPoints
        .map((i) =>
          haversineKm(vehicle.latitude, vehicle.longitude, i.latitude, i.longitude),
        )
        .sort((a, b) => a - b)[0];
      return { vehicle, nearestKm: nearest ?? null };
    })
    .filter(
      (row) =>
        RISK_RANK[row.vehicle.riskLevel] >= RISK_RANK.high ||
        (row.nearestKm !== null && row.nearestKm <= 25),
    )
    .sort((a, b) => (a.nearestKm ?? 1e9) - (b.nearestKm ?? 1e9));

  if (exposed.length === 0) {
    return empty("No vehicles at elevated risk.", "No vehicle is in a high-risk band or near an active incident.");
  }

  return {
    answer: `${exposed.length} vehicle${exposed.length === 1 ? " is" : "s are"} at elevated risk, either in a high-risk band or within 25 km of an active incident.`,
    summary: `${exposed.length} vehicle(s) need attention.`,
    observations: exposed
      .slice(0, 8)
      .map(
        ({ vehicle, nearestKm }) =>
          `${vehicle.vehicleNumber} — ${vehicle.riskLevel} band, carrying ${vehicle.cargoType}${nearestKm !== null ? `, ${Math.round(nearestKm)} km from the nearest active incident` : ""}.`,
      ),
    risks: [
      "Proximity is straight-line distance, not road-network distance — some flagged vehicles may be on the far side of a ridge.",
    ],
    recommendations: [
      "Confirm which flagged vehicles are actually on the affected corridor before re-routing.",
    ],
    affectedEntities: exposed.slice(0, 8).map(({ vehicle }) => ({
      kind: "vehicle" as const,
      label: vehicle.vehicleNumber,
      detail: `${vehicle.riskLevel} · ${vehicle.cargoType}`,
    })),
    confidence: 85,
    limitations: [
      "Straight-line proximity over-triggers by design.",
    ],
  };
}

function emergencyVehicles(w: World): PartialAnswer {
  const emergency = w.vehicles.filter((v) => v.status === "emergency");

  if (emergency.length === 0) {
    return empty("No emergency vehicles deployed.", "No vehicle is currently in emergency status.");
  }

  return {
    answer: `${emergency.length} vehicle${emergency.length === 1 ? " is" : "s are"} operating in emergency status.`,
    summary: `${emergency.length} emergency vehicle(s) deployed.`,
    observations: emergency.map(
      (v) =>
        `${v.vehicleNumber} — ${v.cargoType} to ${v.destination}, driver ${v.driverName}.`,
    ),
    risks: [],
    recommendations: ["Ensure emergency vehicles have a confirmed accessible corridor to their destination."],
    affectedEntities: emergency.map((v) => ({
      kind: "vehicle" as const,
      label: v.vehicleNumber,
      detail: `${v.cargoType} → ${v.destination}`,
    })),
    confidence: 95,
    limitations: [],
  };
}

function criticalDeliveries(w: World): PartialAnswer {
  const critical = w.deliveries.filter(
    (d) =>
      (d.priority === "critical" || d.priority === "emergency") &&
      d.status !== "delivered" &&
      d.status !== "cancelled",
  );

  if (critical.length === 0) {
    return empty("No critical consignments in flight.", "No undelivered consignment is at critical or emergency priority.");
  }

  const atRisk = critical.filter((d) => d.status === "delayed");

  return {
    answer: `${critical.length} critical or emergency consignment${critical.length === 1 ? " is" : "s are"} in flight${atRisk.length > 0 ? `, of which ${atRisk.length} ${atRisk.length === 1 ? "is" : "are"} already delayed` : ""}.`,
    summary: `${critical.length} priority consignment(s), ${atRisk.length} delayed.`,
    observations: critical
      .slice(0, 8)
      .map(
        (d) =>
          `${d.priority.toUpperCase()} — ${d.cargoType} from ${d.origin} to ${d.destination}, status ${d.status.replace(/_/g, " ")}.`,
      ),
    risks:
      atRisk.length > 0
        ? [`${atRisk.length} priority consignment(s) are behind schedule and may miss their delivery window.`]
        : [],
    recommendations:
      atRisk.length > 0
        ? ["Escalate the delayed priority consignments — reassign a vehicle or clear the corridor."]
        : ["Continue monitoring; no priority consignment is currently behind schedule."],
    affectedEntities: critical.slice(0, 8).map((d) => ({
      kind: "delivery" as const,
      label: `${d.cargoType} → ${d.destination}`,
      detail: `${d.priority} · ${d.status.replace(/_/g, " ")}`,
    })),
    confidence: 95,
    limitations: [],
  };
}

function delayedDeliveries(w: World): PartialAnswer {
  const delayed = w.deliveries.filter((d) => d.status === "delayed");

  if (delayed.length === 0) {
    return empty("No delayed consignments.", "Every in-flight consignment is running to schedule.");
  }

  return {
    answer: `${delayed.length} consignment${delayed.length === 1 ? " is" : "s are"} delayed.`,
    summary: `${delayed.length} consignment(s) delayed.`,
    observations: delayed
      .slice(0, 8)
      .map(
        (d) =>
          `${d.cargoType} from ${d.origin} to ${d.destination} — ${d.priority} priority.`,
      ),
    risks: [],
    recommendations: ["Review corridor status for each delayed consignment and re-route where possible."],
    affectedEntities: delayed.slice(0, 8).map((d) => ({
      kind: "delivery" as const,
      label: `${d.cargoType} → ${d.destination}`,
      detail: d.priority,
    })),
    confidence: 95,
    limitations: [],
  };
}

function recentChanges(w: World): PartialAnswer {
  const since = Date.now() - DAY;
  const recent = w.activity.filter((a) => a.createdAt >= since);

  if (recent.length === 0) {
    return empty("Nothing recorded in the last 24 hours.", "The activity log has no entries in this window.");
  }

  const byCategory = new Map<string, number>();
  for (const entry of recent) {
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
  }

  return {
    answer: `${recent.length} event${recent.length === 1 ? "" : "s"} recorded in the last 24 hours: ${[...byCategory.entries()].map(([c, n]) => `${n} ${c}`).join(", ")}.`,
    summary: `${recent.length} events in 24h.`,
    observations: recent.slice(0, 8).map((a) => a.message),
    risks: [],
    recommendations: [],
    affectedEntities: [],
    confidence: 95,
    limitations: ["Limited to the 200 most recent log entries."],
  };
}

function priorities(w: World): PartialAnswer {
  const blocked = w.roads.filter((r) => r.accessibilityStatus === "blocked");
  const criticalIncidents = w.incidents.filter(
    (i) => i.status === "active" && i.severity === "critical",
  );
  const criticalAlerts = w.alerts.filter(
    (a) => a.status === "active" && a.severity === "critical",
  );
  const delayedPriority = w.deliveries.filter(
    (d) =>
      d.status === "delayed" &&
      (d.priority === "critical" || d.priority === "emergency"),
  );
  const criticalRisk = w.predictions.filter((p) => p.riskLevel === "critical");

  const recommendations: string[] = [];
  const entities: AffectedEntity[] = [];

  if (blocked.length > 0) {
    recommendations.push(
      `Re-route traffic off ${blocked.map((r) => r.roadNumber).join(", ")} — ${blocked.length} corridor(s) closed.`,
    );
    entities.push(
      ...blocked.map((r) => ({
        kind: "road" as const,
        label: r.roadNumber,
        detail: r.district,
      })),
    );
  }
  if (delayedPriority.length > 0) {
    recommendations.push(
      `Escalate ${delayedPriority.length} delayed priority consignment(s).`,
    );
  }
  if (criticalIncidents.length > 0) {
    recommendations.push(
      `Confirm containment on ${criticalIncidents.length} critical incident(s).`,
    );
  }
  if (criticalAlerts.length >= 3) {
    recommendations.push(
      `Triage ${criticalAlerts.length} unacknowledged critical alerts.`,
    );
  }
  if (criticalRisk.length > 0) {
    recommendations.push(
      `Pre-position resources at ${criticalRisk.map((p) => p.locationName).join(", ")} — critical risk forecast.`,
    );
  }

  if (recommendations.length === 0) {
    return {
      answer:
        "Nothing currently requires escalation. No corridors are blocked, no priority consignment is delayed, and no location is in the critical risk band.",
      summary: "No escalation required.",
      observations: [
        `${w.roads.length} corridors monitored, none blocked.`,
        `${w.incidents.filter((i) => i.status === "active").length} active incident(s), none critical.`,
      ],
      risks: [],
      recommendations: ["Continue routine monitoring."],
      affectedEntities: [],
      confidence: 90,
      limitations: [],
    };
  }

  return {
    answer: `${recommendations.length} matter${recommendations.length === 1 ? "" : "s"} need attention now, ordered by consequence.`,
    summary: `${recommendations.length} priority action(s).`,
    observations: [
      `${blocked.length} corridor(s) blocked.`,
      `${criticalIncidents.length} critical incident(s) active.`,
      `${delayedPriority.length} priority consignment(s) delayed.`,
      `${criticalAlerts.length} critical alert(s) unacknowledged.`,
    ],
    risks: criticalRisk.map(
      (p) =>
        `${p.predictedIssue} forecast at ${p.locationName} — ${Math.round(p.riskScore)}/100, ${Math.round(p.confidence)}% confidence.`,
    ),
    recommendations,
    affectedEntities: entities.slice(0, 8),
    confidence: 90,
    limitations: [
      "Priorities are ranked by fixed rules, not by a model weighing local context.",
    ],
  };
}

function situationSummary(w: World): PartialAnswer {
  const activeIncidentsList = w.incidents.filter((i) => i.status === "active");
  const blocked = w.roads.filter((r) => r.accessibilityStatus === "blocked");
  const restricted = w.roads.filter(
    (r) => r.accessibilityStatus === "restricted",
  );
  const criticalAlerts = w.alerts.filter(
    (a) => a.status === "active" && a.severity === "critical",
  );
  const movingVehicles = w.vehicles.filter(
    (v) => v.status === "active" || v.status === "emergency",
  );
  const delayed = w.deliveries.filter((d) => d.status === "delayed");
  const criticalRisk = w.predictions.filter(
    (p) => p.riskLevel === "critical" || p.riskLevel === "high",
  );

  return {
    answer: `${movingVehicles.length} of ${w.vehicles.length} vehicles are moving across the region. ${blocked.length} corridor(s) are blocked and ${restricted.length} restricted, with ${activeIncidentsList.length} active incident(s) and ${criticalAlerts.length} unacknowledged critical alert(s).`,
    summary: `${activeIncidentsList.length} incidents · ${blocked.length} blocked · ${criticalAlerts.length} critical alerts.`,
    observations: [
      `${movingVehicles.length}/${w.vehicles.length} vehicles moving.`,
      `${blocked.length} corridor(s) blocked, ${restricted.length} restricted, out of ${w.roads.length}.`,
      `${activeIncidentsList.length} active incident(s).`,
      `${delayed.length} consignment(s) delayed.`,
    ],
    risks: criticalRisk
      .slice(0, 4)
      .map(
        (p) =>
          `${p.predictedIssue} forecast at ${p.locationName}, ${p.district} — ${Math.round(p.riskScore)}/100.`,
      ),
    recommendations:
      blocked.length > 0
        ? [`Re-route off ${blocked.map((r) => r.roadNumber).join(", ")}.`]
        : ["No corridor-level action required."],
    affectedEntities: [
      ...blocked.slice(0, 3).map((r) => ({
        kind: "road" as const,
        label: r.roadNumber,
        detail: r.district,
      })),
      ...activeIncidentsList.slice(0, 3).map((i) => ({
        kind: "incident" as const,
        label: i.incidentType.replace(/_/g, " "),
        detail: i.locationName,
      })),
    ],
    confidence: 92,
    limitations: [
      "Risk entries are forecasts, not confirmed events.",
    ],
  };
}

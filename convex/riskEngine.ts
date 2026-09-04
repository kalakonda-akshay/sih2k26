import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  FLOOD_INDEX,
  INCIDENT_INFLUENCE_KM,
  NER_LOCATIONS,
  RISK_ENGINE_VERSION,
  TERRAIN_INDEX,
} from "./lib/constants";
import { haversineKm, HOUR, logActivity, RISK_RANK } from "./lib/helpers";
import {
  calculateOverallRisk,
  calculateConfidence,
  calculateRainfallRisk,
  calculateIncidentRisk,
  calculateTerrainRisk,
  calculateRoadConditionRisk,
  calculateWeatherRisk,
  calculateHistoricalRisk,
  type NearbyIncident,
  type RiskFactorInputs,
} from "./lib/riskCalculations";
import type { AccessibilityStatus, RiskLevel } from "./lib/validators";

/**
 * NER-Vision AI — risk engine orchestration.
 *
 * The scoring itself lives in `lib/riskCalculations.ts` as pure functions.
 * This module is the part that touches the database: it assembles real inputs
 * for each monitored location, stores the resulting prediction, updates road
 * accessibility, and raises alerts with duplicate suppression.
 */

/* -------------------------------------------------- accessibility policy */

/**
 * Accessibility derived from **confirmed incidents only**.
 *
 * This is deliberately not the road's stored `accessibilityStatus`. The
 * engine writes that field itself, so feeding it back in as a scoring input
 * would create a ratchet: a prediction restricts a road, the restriction adds
 * points, the higher score keeps it restricted forever. Grounding the factor
 * in confirmed incidents keeps it a fact about the world rather than an echo
 * of the engine's own last output.
 */
function confirmedStatusFromIncidents(
  incidentsOnRoad: Doc<"incidents">[],
): AccessibilityStatus {
  const active = incidentsOnRoad.filter((i) => i.status === "active");
  // A landslide on the carriageway closes the road whether or not the control
  // room has ticked "verified" yet. Verification raises confidence in the
  // report; it is not a precondition for treating the corridor as impassable.
  if (active.some((i) => i.severity === "critical")) return "blocked";
  if (active.some((i) => i.severity === "high")) return "restricted";
  return "accessible";
}

/**
 * Final road status, combining confirmed reality with prediction.
 *
 * - A verified critical incident closes the road. Confirmation always wins.
 * - A high or critical *prediction* restricts it — a forecast is grounds for
 *   caution, never for declaring a road impassable.
 * - Otherwise the road is open.
 */
function resolveAccessibility(
  confirmed: AccessibilityStatus,
  predictedLevel: RiskLevel,
): AccessibilityStatus {
  if (confirmed === "blocked") return "blocked";
  if (predictedLevel === "critical" || predictedLevel === "high") {
    return "restricted";
  }
  if (confirmed === "restricted") return "restricted";
  return "accessible";
}

/* ------------------------------------------------------------- the engine */

export interface AssessmentSummary {
  locationName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  predictedIssue: string;
  confidence: number;
  roadNumber?: string;
  accessibilityChanged: boolean;
  alertRaised: boolean;
}

/**
 * Assess one or more locations and persist the results.
 *
 * Exported as a plain function (not a mutation) so other mutations —
 * `weather.createWeatherRecord`, `incidents.createIncident`,
 * `roads.updateRoadStatus` — can invoke it inside their own transaction.
 * That is what makes recalculation automatic rather than scheduled.
 */
export async function runRiskAssessment(
  ctx: MutationCtx,
  options: { locationNames?: string[] } = {},
): Promise<AssessmentSummary[]> {
  const now = Date.now();
  const targets = options.locationNames
    ? NER_LOCATIONS.filter((l) => options.locationNames!.includes(l.name))
    : NER_LOCATIONS;

  if (targets.length === 0) return [];

  // Load once, reuse across every location: far cheaper than per-location reads.
  const [allIncidents, allRoads, allWeather, allPredictions] =
    await Promise.all([
      ctx.db.query("incidents").collect(),
      ctx.db.query("roads").collect(),
      ctx.db.query("weatherData").withIndex("by_recordedAt").order("desc").take(300),
      ctx.db.query("riskPredictions").collect(),
    ]);

  const latestWeather = new Map<string, Doc<"weatherData">>();
  for (const w of allWeather) {
    if (!latestWeather.has(w.locationName)) latestWeather.set(w.locationName, w);
  }

  const latestPrediction = new Map<string, Doc<"riskPredictions">>();
  for (const p of allPredictions) {
    const seen = latestPrediction.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) {
      latestPrediction.set(p.locationName, p);
    }
  }

  const activeIncidents = allIncidents.filter((i) => i.status === "active");
  const summaries: AssessmentSummary[] = [];

  for (const location of targets) {
    /* ------------------------------------------------------- gather inputs */
    const weather = latestWeather.get(location.name);

    const nearby: NearbyIncident[] = activeIncidents
      .map((incident) => ({
        incident,
        distanceKm: haversineKm(
          location.lat,
          location.lng,
          incident.latitude,
          incident.longitude,
        ),
      }))
      .filter(({ distanceKm }) => distanceKm <= INCIDENT_INFLUENCE_KM)
      .map(({ incident, distanceKm }) => ({
        severity: incident.severity,
        distanceKm,
        incidentType: incident.incidentType,
      }));

    // Every incident ever recorded here, resolved ones included.
    const historicalIncidentCount = allIncidents.filter(
      (i) =>
        i.locationName === location.name || i.district === location.district,
    ).length;

    // The corridor this location sits on: prefer a district match, else nearest.
    const districtRoads = allRoads.filter(
      (r) => r.district === location.district,
    );
    const road =
      districtRoads[0] ??
      [...allRoads].sort(
        (a, b) =>
          haversineKm(location.lat, location.lng, a.startLatitude, a.startLongitude) -
          haversineKm(location.lat, location.lng, b.startLatitude, b.startLongitude),
      )[0];

    const incidentsOnRoad = road
      ? allIncidents.filter((i) => i.roadId === road._id)
      : [];
    const confirmedStatus = confirmedStatusFromIncidents(incidentsOnRoad);

    const previous = latestPrediction.get(location.name);

    const inputs: RiskFactorInputs = {
      locationName: location.name,
      rainfallMm: weather?.rainfall,
      weatherCondition: weather?.weatherCondition,
      weatherAlertLevel: weather?.alertLevel,
      windSpeedKmph: weather?.windSpeed,
      humidityPct: weather?.humidity,
      weatherAgeHours: weather
        ? (now - weather.recordedAt) / HOUR
        : undefined,
      nearbyIncidents: nearby,
      terrainIndex: TERRAIN_INDEX[location.name],
      floodIndex: FLOOD_INDEX[location.name],
      accessibilityStatus: confirmedStatus,
      historicalIncidentCount,
      previousScore: previous?.riskScore,
    };

    /* -------------------------------------------------------------- score */
    const assessment = calculateOverallRisk(inputs);
    const { reason: confidenceReason } = calculateConfidence(
      assessment.contributingFactors,
      inputs,
    );

    const recommendedAction = assessment.recommendedAction.replace(
      location.name,
      road ? `${road.roadNumber} at ${location.name}` : location.name,
    );

    await ctx.db.insert("riskPredictions", {
      locationName: location.name,
      latitude: location.lat,
      longitude: location.lng,
      state: location.state,
      district: location.district,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      predictedIssue: assessment.predictedIssue,
      predictedIssueType: assessment.predictedIssueType,
      confidence: assessment.confidence,
      contributingFactors: assessment.contributingFactors.map((f) => ({
        factor: f.factor,
        weight: f.weight,
        explanation: f.explanation,
        maxWeight: f.maxWeight,
      })),
      recommendedAction,
      roadId: road?._id,
      horizonHours: 24,
      modelVersion: RISK_ENGINE_VERSION,
      createdAt: now,
    });

    /* ----------------------------------------- accessibility intelligence */
    let accessibilityChanged = false;
    if (road) {
      const nextStatus = resolveAccessibility(
        confirmedStatus,
        assessment.riskLevel,
      );
      const nextScore =
        confirmedStatus === "blocked" ? 100 : assessment.riskScore;

      if (
        road.accessibilityStatus !== nextStatus ||
        Math.abs(road.riskScore - nextScore) >= 1
      ) {
        accessibilityChanged = road.accessibilityStatus !== nextStatus;
        await ctx.db.patch(road._id, {
          accessibilityStatus: nextStatus,
          riskScore: nextScore,
          riskLevel:
            confirmedStatus === "blocked" ? "critical" : assessment.riskLevel,
          lastUpdated: now,
        });

        if (accessibilityChanged) {
          await logActivity(ctx, {
            eventType: "road_status_change",
            category: "risk",
            message: `${road.roadNumber} ${road.roadName} → ${nextStatus} (risk ${nextScore}/100, ${assessment.riskLevel}).`,
            severity:
              nextStatus === "blocked"
                ? "critical"
                : nextStatus === "restricted"
                  ? "high"
                  : undefined,
            relatedRoadId: road._id,
            createdAt: now,
          });
        }
      }
    }

    /* ------------------------------------------------ alerting with dedupe */
    const alertRaised = await raiseRiskAlert(ctx, {
      location,
      road,
      riskLevel: assessment.riskLevel,
      riskScore: assessment.riskScore,
      predictedIssue: assessment.predictedIssue,
      confidence: assessment.confidence,
      confidenceReason,
      recommendedAction,
      now,
    });

    summaries.push({
      locationName: location.name,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      predictedIssue: assessment.predictedIssue,
      confidence: assessment.confidence,
      roadNumber: road?.roadNumber,
      accessibilityChanged,
      alertRaised,
    });
  }

  return summaries;
}

/**
 * Raise a risk alert, or don't.
 *
 * Duplicate suppression works on a stable `dedupeKey` of
 * `risk:<location>:<level>`. If an active alert already carries that key the
 * condition is already on someone's screen and nothing is created. When the
 * band changes, the stale alert for the old band is resolved first, so the
 * alert centre tracks the current situation instead of accumulating history.
 */
async function raiseRiskAlert(
  ctx: MutationCtx,
  args: {
    location: (typeof NER_LOCATIONS)[number];
    road?: Doc<"roads">;
    riskLevel: RiskLevel;
    riskScore: number;
    predictedIssue: string;
    confidence: number;
    confidenceReason: string;
    recommendedAction: string;
    now: number;
  },
): Promise<boolean> {
  const { location, road, riskLevel, now } = args;

  const existingForLocation = await ctx.db
    .query("alerts")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .collect();

  const mine = existingForLocation.filter((a) =>
    a.dedupeKey?.startsWith(`risk:${location.name}:`),
  );

  const wanted = `risk:${location.name}:${riskLevel}`;
  const isElevated = riskLevel === "high" || riskLevel === "critical";

  // Already reported at this exact band — say nothing.
  if (mine.some((a) => a.dedupeKey === wanted)) return false;

  // Band changed (or dropped back to safe): retire the stale alert.
  for (const stale of mine) {
    await ctx.db.patch(stale._id, { status: "resolved", resolvedAt: now });
  }

  if (!isElevated) return false;

  const alertId = await ctx.db.insert("alerts", {
    title: `Predicted ${riskLevel} risk — ${location.name}`,
    message: `${args.predictedIssue} at ${location.name}, ${location.district}. Score ${args.riskScore}/100 with ${args.confidence}% confidence. ${args.confidenceReason}`,
    alertType:
      args.predictedIssue.toLowerCase().includes("landslide")
        ? "landslide_risk"
        : args.predictedIssue.toLowerCase().includes("flood")
          ? "severe_weather"
          : "accessibility",
    severity: riskLevel === "critical" ? "critical" : "high",
    status: "active",
    latitude: location.lat,
    longitude: location.lng,
    locationName: location.name,
    district: location.district,
    state: location.state,
    relatedRoadId: road?._id,
    recommendedAction: args.recommendedAction,
    dedupeKey: wanted,
    createdAt: now,
  });

  await logActivity(ctx, {
    eventType: "risk_prediction",
    category: "risk",
    message: `Risk engine raised ${location.name} to ${riskLevel} (${args.riskScore}/100) — ${args.predictedIssue}.`,
    severity: riskLevel === "critical" ? "critical" : "high",
    relatedAlertId: alertId,
    relatedRoadId: road?._id,
    createdAt: now,
  });

  return true;
}

/* ----------------------------------------------------------- public API */

/**
 * Recompute every monitored location within `radiusKm` of a point.
 *
 * Used by the incident hooks: a landslide changes the picture for the places
 * near it, not for the whole region, so this keeps the write amplification of
 * a single field report proportionate.
 */
export async function runRiskAssessmentNear(
  ctx: MutationCtx,
  latitude: number,
  longitude: number,
  radiusKm: number = INCIDENT_INFLUENCE_KM,
): Promise<AssessmentSummary[]> {
  const names = NER_LOCATIONS.filter(
    (l) => haversineKm(latitude, longitude, l.lat, l.lng) <= radiusKm,
  ).map((l) => l.name);

  if (names.length === 0) return [];
  return await runRiskAssessment(ctx, { locationNames: names });
}

/** Recompute every monitored location. */
export const assessAllLocations = mutation({
  args: {},
  handler: async (ctx) => {
    const results = await runRiskAssessment(ctx);
    return {
      assessed: results.length,
      critical: results.filter((r) => r.riskLevel === "critical").length,
      high: results.filter((r) => r.riskLevel === "high").length,
      alertsRaised: results.filter((r) => r.alertRaised).length,
      statusChanges: results.filter((r) => r.accessibilityChanged).length,
    };
  },
});

/** Recompute a single location — used after a targeted data change. */
export const assessLocation = mutation({
  args: { locationName: v.string() },
  handler: async (ctx, { locationName }) => {
    const results = await runRiskAssessment(ctx, {
      locationNames: [locationName],
    });
    return results[0] ?? null;
  },
});

/* -------------------------------------------------------------- queries */

/** Headline numbers for the Risk Intelligence page. */
export const getRiskOverview = query({
  args: {},
  handler: async (ctx) => {
    const [predictions, roads] = await Promise.all([
      ctx.db.query("riskPredictions").collect(),
      ctx.db.query("roads").collect(),
    ]);

    const latest = new Map<string, Doc<"riskPredictions">>();
    for (const p of predictions) {
      const seen = latest.get(p.locationName);
      if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
    }
    const current = [...latest.values()];

    const distribution = { low: 0, moderate: 0, high: 0, critical: 0 };
    for (const p of current) distribution[p.riskLevel] += 1;

    const averageRisk =
      current.length === 0
        ? 0
        : Math.round(
            current.reduce((sum, p) => sum + p.riskScore, 0) / current.length,
          );

    const highRiskRoads = roads.filter(
      (r) => r.riskLevel === "high" || r.riskLevel === "critical",
    ).length;

    const lastRunAt = current.reduce(
      (max, p) => Math.max(max, p.createdAt),
      0,
    );

    return {
      monitoredLocations: NER_LOCATIONS.length,
      assessedLocations: current.length,
      averageRisk,
      criticalLocations: distribution.critical,
      highRiskLocations: distribution.high,
      highRiskRoads,
      totalRoads: roads.length,
      predictionsGenerated: predictions.length,
      distribution,
      lastRunAt: lastRunAt || null,
      engineVersion: RISK_ENGINE_VERSION,
    };
  },
});

/** Current assessment per location, worst first. */
export const getCurrentAssessments = query({
  args: { limit: v.optional(v.number()), minLevel: v.optional(v.string()) },
  handler: async (ctx, { limit, minLevel }) => {
    const predictions = await ctx.db.query("riskPredictions").collect();

    const latest = new Map<string, Doc<"riskPredictions">>();
    for (const p of predictions) {
      const seen = latest.get(p.locationName);
      if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
    }

    let current = [...latest.values()];
    if (minLevel && minLevel in RISK_RANK) {
      const floor = RISK_RANK[minLevel as RiskLevel];
      current = current.filter((p) => RISK_RANK[p.riskLevel] >= floor);
    }

    current.sort((a, b) => {
      const r = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
      return r !== 0 ? r : b.riskScore - a.riskScore;
    });

    return limit ? current.slice(0, limit) : current;
  },
});

/** Roads carrying elevated risk, with the factor that drove it. */
export const getHighRiskRoads = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const [roads, predictions] = await Promise.all([
      ctx.db.query("roads").collect(),
      ctx.db.query("riskPredictions").collect(),
    ]);

    const latestByRoad = new Map<Id<"roads">, Doc<"riskPredictions">>();
    for (const p of predictions) {
      if (!p.roadId) continue;
      const seen = latestByRoad.get(p.roadId);
      if (!seen || p.createdAt > seen.createdAt) latestByRoad.set(p.roadId, p);
    }

    const elevated = roads
      .filter((r) => r.riskLevel === "high" || r.riskLevel === "critical")
      .sort((a, b) => b.riskScore - a.riskScore);

    const rows = elevated.map((road) => {
      const prediction = latestByRoad.get(road._id);
      const primary = prediction?.contributingFactors
        ?.slice()
        .sort((a, b) => b.weight - a.weight)[0];

      return {
        _id: road._id,
        roadNumber: road.roadNumber,
        roadName: road.roadName,
        district: road.district,
        state: road.state,
        accessibilityStatus: road.accessibilityStatus,
        riskScore: road.riskScore,
        riskLevel: road.riskLevel,
        latitude: road.startLatitude,
        longitude: road.startLongitude,
        primaryFactor: primary?.factor ?? "Not yet assessed",
        primaryFactorWeight: primary?.weight ?? 0,
        recommendedAction:
          prediction?.recommendedAction ??
          "Run the risk engine to generate a recommendation.",
        lastUpdated: road.lastUpdated,
      };
    });

    return limit ? rows.slice(0, limit) : rows;
  },
});

/**
 * Re-derive the factor breakdown for a stored prediction.
 *
 * Exposes the engine's full arithmetic — every factor, its cap, its points
 * and the sentence explaining them — for the explainability panel.
 */
export const explainPrediction = query({
  args: { predictionId: v.id("riskPredictions") },
  handler: async (ctx, { predictionId }) => {
    const prediction = await ctx.db.get(predictionId);
    if (!prediction) return null;

    const road = prediction.roadId ? await ctx.db.get(prediction.roadId) : null;

    return {
      prediction,
      road,
      caps: {
        rainfall: calculateRainfallRisk(undefined).maxWeight,
        incidents: calculateIncidentRisk([]).maxWeight,
        terrain: calculateTerrainRisk(undefined).maxWeight,
        roadCondition: calculateRoadConditionRisk(undefined).maxWeight,
        weather: calculateWeatherRisk().maxWeight,
        historical: calculateHistoricalRisk(0).maxWeight,
      },
      engineVersion: RISK_ENGINE_VERSION,
    };
  },
});

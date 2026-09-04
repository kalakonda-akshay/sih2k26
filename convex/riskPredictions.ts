import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity, riskLevelFromScore, RISK_RANK } from "./lib/helpers";
import { riskLevel } from "./lib/validators";

/**
 * Latest AI risk predictions, highest band first.
 *
 * These are forecasts, not observations. The UI labels them PREDICTED RISK to
 * keep them visually distinct from confirmed incidents.
 */
export const getLatestPredictions = query({
  args: {
    limit: v.optional(v.number()),
    minRiskLevel: v.optional(riskLevel),
  },
  handler: async (ctx, { limit, minRiskLevel }) => {
    const predictions = await ctx.db
      .query("riskPredictions")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    const filtered = minRiskLevel
      ? predictions.filter(
          (p) => RISK_RANK[p.riskLevel] >= RISK_RANK[minRiskLevel],
        )
      : predictions;

    filtered.sort((a, b) => {
      const r = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
      if (r !== 0) return r;
      const s = b.riskScore - a.riskScore;
      return s !== 0 ? s : b.createdAt - a.createdAt;
    });

    return limit ? filtered.slice(0, limit) : filtered;
  },
});

export const getPredictionsByDistrict = query({
  args: { district: v.string() },
  handler: async (ctx, { district }) => {
    const predictions = await ctx.db
      .query("riskPredictions")
      .withIndex("by_district", (q) => q.eq("district", district))
      .collect();

    return predictions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getPrediction = query({
  args: { predictionId: v.id("riskPredictions") },
  handler: async (ctx, { predictionId }) => await ctx.db.get(predictionId),
});

/**
 * Record a prediction.
 *
 * `riskLevel` is always derived from the score so the two can never disagree,
 * and `contributingFactors` carries weights rather than bare strings so the
 * UI can render a real explanation of where the score came from.
 *
 * This mutation is the integration point for the future Python risk service:
 * that service will call this over the Convex HTTP API and nothing else in
 * the application has to change.
 */
export const createPrediction = mutation({
  args: {
    locationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    state: v.string(),
    district: v.string(),
    riskScore: v.number(),
    predictedIssue: v.string(),
    confidence: v.number(),
    contributingFactors: v.array(
      v.object({ factor: v.string(), weight: v.number() }),
    ),
    recommendedAction: v.string(),
    roadId: v.optional(v.id("roads")),
    horizonHours: v.optional(v.number()),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const level = riskLevelFromScore(args.riskScore);

    const predictionId = await ctx.db.insert("riskPredictions", {
      ...args,
      riskLevel: level,
      createdAt: Date.now(),
    });

    await logActivity(ctx, {
      eventType: "risk_prediction",
      category: "risk",
      message: `Risk model flagged ${args.locationName}, ${args.district} at ${Math.round(args.riskScore)}/100 — ${args.predictedIssue}.`,
      severity:
        level === "critical" ? "critical" : level === "high" ? "high" : "medium",
      relatedRoadId: args.roadId,
    });

    // A critical forecast raises its own alert, clearly marked as predictive.
    if (level === "critical") {
      const alertId = await ctx.db.insert("alerts", {
        title: `Predicted: ${args.predictedIssue} — ${args.locationName}`,
        message: `Risk model forecasts ${args.predictedIssue.toLowerCase()} at ${args.locationName} with ${Math.round(args.confidence)}% confidence (score ${Math.round(args.riskScore)}/100).`,
        alertType: "landslide_risk",
        severity: "critical",
        status: "active",
        latitude: args.latitude,
        longitude: args.longitude,
        locationName: args.locationName,
        district: args.district,
        state: args.state,
        relatedRoadId: args.roadId,
        recommendedAction: args.recommendedAction,
        createdAt: Date.now(),
      });

      await logActivity(ctx, {
        eventType: "alert_created",
        category: "alert",
        message: `Predictive alert raised for ${args.locationName}.`,
        severity: "critical",
        relatedAlertId: alertId,
      });
    }

    return predictionId;
  },
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity, riskLevelFromScore } from "./lib/helpers";
import { accessibilityStatus, riskLevel } from "./lib/validators";

export const listRoads = query({
  args: {
    state: v.optional(v.string()),
    accessibilityStatus: v.optional(accessibilityStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let roads;
    if (args.state) {
      roads = await ctx.db
        .query("roads")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .collect();
    } else if (args.accessibilityStatus) {
      roads = await ctx.db
        .query("roads")
        .withIndex("by_accessibilityStatus", (q) =>
          q.eq("accessibilityStatus", args.accessibilityStatus!),
        )
        .collect();
    } else {
      roads = await ctx.db.query("roads").collect();
    }

    if (args.state && args.accessibilityStatus) {
      roads = roads.filter(
        (r) => r.accessibilityStatus === args.accessibilityStatus,
      );
    }

    roads.sort((a, b) => b.riskScore - a.riskScore);
    return args.limit ? roads.slice(0, args.limit) : roads;
  },
});

export const getRoad = query({
  args: { roadId: v.id("roads") },
  handler: async (ctx, { roadId }) => await ctx.db.get(roadId),
});

export const getRoadsByDistrict = query({
  args: { district: v.string() },
  handler: async (ctx, { district }) =>
    await ctx.db
      .query("roads")
      .withIndex("by_district", (q) => q.eq("district", district))
      .collect(),
});

export const getRoadsByRiskLevel = query({
  args: { riskLevel: riskLevel },
  handler: async (ctx, args) =>
    await ctx.db
      .query("roads")
      .withIndex("by_riskLevel", (q) => q.eq("riskLevel", args.riskLevel))
      .collect(),
});

export const createRoad = mutation({
  args: {
    roadName: v.string(),
    roadNumber: v.string(),
    state: v.string(),
    district: v.string(),
    startLatitude: v.number(),
    startLongitude: v.number(),
    endLatitude: v.number(),
    endLongitude: v.number(),
    accessibilityStatus: accessibilityStatus,
    riskScore: v.number(),
    lengthKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("roads")
      .withIndex("by_roadNumber", (q) => q.eq("roadNumber", args.roadNumber))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("roads", {
      ...args,
      riskLevel: riskLevelFromScore(args.riskScore),
      lastUpdated: now,
      createdAt: now,
    });
  },
});

export const updateRoadStatus = mutation({
  args: {
    roadId: v.id("roads"),
    accessibilityStatus: accessibilityStatus,
  },
  handler: async (ctx, args) => {
    const road = await ctx.db.get(args.roadId);
    if (!road) throw new Error(`Road ${args.roadId} not found`);

    await ctx.db.patch(args.roadId, {
      accessibilityStatus: args.accessibilityStatus,
      lastUpdated: Date.now(),
    });

    if (road.accessibilityStatus !== args.accessibilityStatus) {
      await logActivity(ctx, {
        eventType: "road_status_change",
        category: "risk",
        message: `${road.roadNumber} ${road.roadName} marked as ${args.accessibilityStatus}.`,
        severity:
          args.accessibilityStatus === "blocked" ? "critical" : "medium",
        relatedRoadId: args.roadId,
      });
    }

    return args.roadId;
  },
});

/**
 * Apply a new risk score. The band is always derived from the score rather
 * than passed in, so the two can never disagree.
 */
export const updateRoadRisk = mutation({
  args: {
    roadId: v.id("roads"),
    riskScore: v.number(),
  },
  handler: async (ctx, { roadId, riskScore }) => {
    const road = await ctx.db.get(roadId);
    if (!road) throw new Error(`Road ${roadId} not found`);

    const nextLevel = riskLevelFromScore(riskScore);
    await ctx.db.patch(roadId, {
      riskScore,
      riskLevel: nextLevel,
      lastUpdated: Date.now(),
    });

    if (road.riskLevel !== nextLevel) {
      await logActivity(ctx, {
        eventType: "road_risk_change",
        category: "risk",
        message: `${road.roadNumber} risk moved from ${road.riskLevel} to ${nextLevel} (score ${Math.round(riskScore)}).`,
        severity: nextLevel === "critical" ? "critical" : "medium",
        relatedRoadId: roadId,
      });
    }

    return roadId;
  },
});

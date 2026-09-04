import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./lib/helpers";
import { runRiskAssessment } from "./riskEngine";
import { weatherAlertLevel, weatherCondition } from "./lib/validators";

/**
 * Most recent observation per location.
 *
 * The table is append-only (a time series), so "latest" means reducing the
 * history down to one row per place rather than reading the whole table.
 */
export const getLatestWeather = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const records = await ctx.db
      .query("weatherData")
      .withIndex("by_recordedAt")
      .order("desc")
      .collect();

    const latestByLocation = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      if (!latestByLocation.has(record.locationName)) {
        latestByLocation.set(record.locationName, record);
      }
    }

    const latest = [...latestByLocation.values()].sort(
      (a, b) => b.rainfall - a.rainfall,
    );

    return limit ? latest.slice(0, limit) : latest;
  },
});

export const getWeatherByLocation = query({
  args: {
    locationName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { locationName, limit }) => {
    const records = await ctx.db
      .query("weatherData")
      .withIndex("by_locationName", (q) => q.eq("locationName", locationName))
      .collect();

    records.sort((a, b) => b.recordedAt - a.recordedAt);
    return limit ? records.slice(0, limit) : records;
  },
});

/** Locations currently under an orange or red warning. */
export const getSevereWeatherLocations = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db
      .query("weatherData")
      .withIndex("by_recordedAt")
      .order("desc")
      .collect();

    const latestByLocation = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      if (!latestByLocation.has(record.locationName)) {
        latestByLocation.set(record.locationName, record);
      }
    }

    return [...latestByLocation.values()]
      .filter((r) => r.alertLevel === "orange" || r.alertLevel === "red")
      .sort((a, b) => b.rainfall - a.rainfall);
  },
});

export const createWeatherRecord = mutation({
  args: {
    locationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    temperature: v.number(),
    rainfall: v.number(),
    humidity: v.number(),
    weatherCondition: weatherCondition,
    windSpeed: v.number(),
    alertLevel: weatherAlertLevel,
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    recordedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { recordedAt, ...rest } = args;

    const recordId = await ctx.db.insert("weatherData", {
      ...rest,
      recordedAt: recordedAt ?? Date.now(),
    });

    if (args.alertLevel === "red") {
      await logActivity(ctx, {
        eventType: "system",
        category: "risk",
        message: `Red weather warning at ${args.locationName} — ${Math.round(args.rainfall)} mm rainfall in 24h.`,
        severity: "critical",
      });
    }

    // Rainfall is the engine's heaviest input, so a new observation re-scores
    // this location immediately rather than waiting for a scheduled pass.
    const assessment = await runRiskAssessment(ctx, {
      locationNames: [args.locationName],
    });

    return { recordId, assessment: assessment[0] ?? null };
  },
});

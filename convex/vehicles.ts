import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity, RISK_RANK } from "./lib/helpers";
import {
  cargoType,
  riskLevel,
  vehicleStatus,
  vehicleType,
} from "./lib/validators";

export const listVehicles = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(vehicleStatus),
  },
  handler: async (ctx, { limit, status }) => {
    const vehicles = status
      ? await ctx.db
          .query("vehicles")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("vehicles").collect();

    vehicles.sort((a, b) => b.lastUpdated - a.lastUpdated);
    return limit ? vehicles.slice(0, limit) : vehicles;
  },
});

export const getVehicle = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, { vehicleId }) => await ctx.db.get(vehicleId),
});

export const getVehiclesByStatus = query({
  args: { status: vehicleStatus },
  handler: async (ctx, { status }) =>
    await ctx.db
      .query("vehicles")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect(),
});

export const getVehiclesByRiskLevel = query({
  args: { riskLevel: riskLevel },
  handler: async (ctx, args) =>
    await ctx.db
      .query("vehicles")
      .withIndex("by_riskLevel", (q) => q.eq("riskLevel", args.riskLevel))
      .collect(),
});

/**
 * Priority vehicles for the dashboard monitor panel: emergency and delayed
 * first, then by risk band, then by most recent telemetry.
 */
export const getPriorityVehicles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 6 }) => {
    const vehicles = await ctx.db.query("vehicles").collect();

    const statusWeight: Record<string, number> = {
      emergency: 4,
      delayed: 3,
      active: 2,
      idle: 1,
      offline: 0,
    };

    vehicles.sort((a, b) => {
      const s = (statusWeight[b.status] ?? 0) - (statusWeight[a.status] ?? 0);
      if (s !== 0) return s;
      const r = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
      if (r !== 0) return r;
      return b.lastUpdated - a.lastUpdated;
    });

    return vehicles.slice(0, limit);
  },
});

export const createVehicle = mutation({
  args: {
    vehicleNumber: v.string(),
    vehicleType: vehicleType,
    cargoType: cargoType,
    driverName: v.string(),
    driverPhone: v.string(),
    status: vehicleStatus,
    latitude: v.number(),
    longitude: v.number(),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    destination: v.string(),
    riskLevel: v.optional(riskLevel),
    operatorId: v.optional(v.id("users")),
    capacityTonnes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Registration number is the natural key — keep creation idempotent.
    const existing = await ctx.db
      .query("vehicles")
      .withIndex("by_vehicleNumber", (q) =>
        q.eq("vehicleNumber", args.vehicleNumber),
      )
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    const vehicleId = await ctx.db.insert("vehicles", {
      ...args,
      speed: args.speed ?? 0,
      heading: args.heading ?? 0,
      riskLevel: args.riskLevel ?? "low",
      lastUpdated: now,
      createdAt: now,
    });

    await logActivity(ctx, {
      eventType: "vehicle_status_change",
      category: "logistics",
      message: `Vehicle ${args.vehicleNumber} registered and assigned to ${args.destination}.`,
      relatedVehicleId: vehicleId,
    });

    return vehicleId;
  },
});

/**
 * Telemetry ingest. The same entry point serves the demo simulator and any
 * real GPS device added later.
 *
 * When a vehicle escalates into a high or critical risk band this also raises
 * an alert — that escalation is what makes "vehicle entered a high-risk zone"
 * appear on the dashboard without any frontend polling.
 */
export const updateVehicleLocation = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    latitude: v.number(),
    longitude: v.number(),
    speed: v.optional(v.number()),
    heading: v.optional(v.number()),
    riskLevel: v.optional(riskLevel),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${args.vehicleId} not found`);

    const nextRisk = args.riskLevel ?? vehicle.riskLevel;
    const escalated =
      RISK_RANK[nextRisk] > RISK_RANK[vehicle.riskLevel] &&
      RISK_RANK[nextRisk] >= RISK_RANK.high;

    await ctx.db.patch(args.vehicleId, {
      latitude: args.latitude,
      longitude: args.longitude,
      speed: args.speed ?? vehicle.speed,
      heading: args.heading ?? vehicle.heading,
      riskLevel: nextRisk,
      lastUpdated: Date.now(),
    });

    if (escalated) {
      const alertId = await ctx.db.insert("alerts", {
        title: `${vehicle.vehicleNumber} entered ${nextRisk}-risk zone`,
        message: `Vehicle ${vehicle.vehicleNumber} carrying ${vehicle.cargoType} is traversing a ${nextRisk}-risk segment en route to ${vehicle.destination}.`,
        alertType: "vehicle_delay",
        severity: nextRisk === "critical" ? "critical" : "high",
        status: "active",
        latitude: args.latitude,
        longitude: args.longitude,
        relatedVehicleId: args.vehicleId,
        recommendedAction:
          nextRisk === "critical"
            ? "Halt the vehicle at the nearest safe point and re-route via the safest alternative."
            : "Monitor closely and prepare an alternative route.",
        createdAt: Date.now(),
      });

      await logActivity(ctx, {
        eventType: "vehicle_movement",
        category: "logistics",
        message: `Vehicle ${vehicle.vehicleNumber} entered a ${nextRisk}-risk zone.`,
        severity: nextRisk === "critical" ? "critical" : "high",
        relatedVehicleId: args.vehicleId,
        relatedAlertId: alertId,
      });
    }

    return args.vehicleId;
  },
});

export const updateVehicleStatus = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    status: vehicleStatus,
    riskLevel: v.optional(riskLevel),
  },
  handler: async (ctx, { vehicleId, status, riskLevel: nextRisk }) => {
    const vehicle = await ctx.db.get(vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    await ctx.db.patch(vehicleId, {
      status,
      ...(nextRisk ? { riskLevel: nextRisk } : {}),
      lastUpdated: Date.now(),
    });

    if (vehicle.status !== status) {
      await logActivity(ctx, {
        eventType: "vehicle_status_change",
        category: "logistics",
        message: `Vehicle ${vehicle.vehicleNumber} status changed from ${vehicle.status} to ${status}.`,
        severity: status === "emergency" ? "critical" : undefined,
        relatedVehicleId: vehicleId,
      });
    }

    return vehicleId;
  },
});

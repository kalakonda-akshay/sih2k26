import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity, SEVERITY_RANK } from "./lib/helpers";
import {
  alertStatus,
  alertType,
  severity as severityValidator,
} from "./lib/validators";

/**
 * Active alerts, ordered critical → high → medium → low and newest first
 * within a band. The dashboard panel renders this list directly.
 */
export const listActiveAlerts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    alerts.sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return s !== 0 ? s : b.createdAt - a.createdAt;
    });

    return limit ? alerts.slice(0, limit) : alerts;
  },
});

export const listAlerts = query({
  args: {
    status: v.optional(alertStatus),
    alertType: v.optional(alertType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const alerts = args.status
      ? await ctx.db
          .query("alerts")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("alerts").collect();

    const filtered = args.alertType
      ? alerts.filter((a) => a.alertType === args.alertType)
      : alerts;

    filtered.sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return s !== 0 ? s : b.createdAt - a.createdAt;
    });

    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

export const getAlert = query({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert) return null;

    const [incident, vehicle, road] = await Promise.all([
      alert.relatedIncidentId
        ? ctx.db.get(alert.relatedIncidentId)
        : Promise.resolve(null),
      alert.relatedVehicleId
        ? ctx.db.get(alert.relatedVehicleId)
        : Promise.resolve(null),
      alert.relatedRoadId
        ? ctx.db.get(alert.relatedRoadId)
        : Promise.resolve(null),
    ]);

    return { ...alert, incident, vehicle, road };
  },
});

export const getCriticalAlerts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_status_and_severity", (q) =>
        q.eq("status", "active").eq("severity", "critical"),
      )
      .collect();

    alerts.sort((a, b) => b.createdAt - a.createdAt);
    return limit ? alerts.slice(0, limit) : alerts;
  },
});

export const createAlert = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    alertType: alertType,
    severity: severityValidator,
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationName: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    relatedIncidentId: v.optional(v.id("incidents")),
    relatedVehicleId: v.optional(v.id("vehicles")),
    relatedRoadId: v.optional(v.id("roads")),
    recommendedAction: v.string(),
  },
  handler: async (ctx, args) => {
    const alertId = await ctx.db.insert("alerts", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });

    await logActivity(ctx, {
      eventType: "alert_created",
      category: "alert",
      message: args.title,
      severity: args.severity,
      relatedAlertId: alertId,
      relatedIncidentId: args.relatedIncidentId,
      relatedVehicleId: args.relatedVehicleId,
      relatedRoadId: args.relatedRoadId,
    });

    return alertId;
  },
});

export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("alerts"),
    acknowledgedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, { alertId, acknowledgedBy }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);
    if (alert.status !== "active") return alertId;

    await ctx.db.patch(alertId, {
      status: "acknowledged",
      acknowledgedBy,
      acknowledgedAt: Date.now(),
    });

    await logActivity(ctx, {
      eventType: "alert_acknowledged",
      category: "alert",
      message: `Alert acknowledged: ${alert.title}`,
      severity: alert.severity,
      relatedAlertId: alertId,
    });

    return alertId;
  },
});

export const resolveAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    await ctx.db.patch(alertId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });

    await logActivity(ctx, {
      eventType: "alert_resolved",
      category: "alert",
      message: `Alert resolved: ${alert.title}`,
      relatedAlertId: alertId,
    });

    return alertId;
  },
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./lib/helpers";
import {
  cargoType,
  deliveryPriority,
  deliveryStatus,
} from "./lib/validators";

const PRIORITY_RANK: Record<string, number> = {
  emergency: 4,
  critical: 3,
  high: 2,
  normal: 1,
};

export const listDeliveries = query({
  args: {
    status: v.optional(deliveryStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const deliveries = status
      ? await ctx.db
          .query("deliveries")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("deliveries").collect();

    deliveries.sort((a, b) => {
      const p =
        (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      return p !== 0 ? p : a.estimatedArrival - b.estimatedArrival;
    });

    return limit ? deliveries.slice(0, limit) : deliveries;
  },
});

/**
 * In-flight deliveries joined with their vehicle, so the monitor panel can
 * show cargo, driver and live position without a second query per row.
 */
export const getActiveDeliveries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const pending = await ctx.db
      .query("deliveries")
      .withIndex("by_status", (q) => q.eq("status", "in_transit"))
      .collect();
    const delayed = await ctx.db
      .query("deliveries")
      .withIndex("by_status", (q) => q.eq("status", "delayed"))
      .collect();

    const active = [...pending, ...delayed].sort((a, b) => {
      const p =
        (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      return p !== 0 ? p : a.estimatedArrival - b.estimatedArrival;
    });

    const sliced = limit ? active.slice(0, limit) : active;

    return await Promise.all(
      sliced.map(async (delivery) => ({
        ...delivery,
        vehicle: await ctx.db.get(delivery.vehicleId),
      })),
    );
  },
});

export const getDelivery = query({
  args: { deliveryId: v.id("deliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery) return null;

    const [vehicle, route] = await Promise.all([
      ctx.db.get(delivery.vehicleId),
      delivery.currentRouteId
        ? ctx.db.get(delivery.currentRouteId)
        : Promise.resolve(null),
    ]);

    return { ...delivery, vehicle, route };
  },
});

export const createDelivery = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    cargoType: cargoType,
    priority: deliveryPriority,
    origin: v.string(),
    destination: v.string(),
    estimatedArrival: v.number(),
    currentRouteId: v.optional(v.id("routes")),
    status: v.optional(deliveryStatus),
    progress: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${args.vehicleId} not found`);

    const now = Date.now();
    const deliveryId = await ctx.db.insert("deliveries", {
      ...args,
      status: args.status ?? "pending",
      progress: args.progress ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      eventType: "delivery_update",
      category: "logistics",
      message: `${args.priority === "emergency" ? "Emergency" : "New"} ${args.cargoType} consignment created: ${args.origin} → ${args.destination}.`,
      severity: args.priority === "emergency" ? "critical" : undefined,
      relatedDeliveryId: deliveryId,
      relatedVehicleId: args.vehicleId,
    });

    return deliveryId;
  },
});

export const updateDeliveryStatus = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    status: deliveryStatus,
    progress: v.optional(v.number()),
    actualArrival: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) throw new Error(`Delivery ${args.deliveryId} not found`);

    await ctx.db.patch(args.deliveryId, {
      status: args.status,
      ...(args.progress !== undefined ? { progress: args.progress } : {}),
      ...(args.actualArrival !== undefined
        ? { actualArrival: args.actualArrival }
        : args.status === "delivered"
          ? { actualArrival: Date.now() }
          : {}),
      updatedAt: Date.now(),
    });

    if (delivery.status !== args.status) {
      await logActivity(ctx, {
        eventType: "delivery_update",
        category: "logistics",
        message: `Consignment to ${delivery.destination} is now ${args.status.replace("_", " ")}.`,
        severity: args.status === "delayed" ? "high" : undefined,
        relatedDeliveryId: args.deliveryId,
        relatedVehicleId: delivery.vehicleId,
      });
    }

    return args.deliveryId;
  },
});

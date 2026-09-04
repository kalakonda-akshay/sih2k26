import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { curvedLine, logActivity } from "./lib/helpers";
import { lineString, routeStatus, routeType } from "./lib/validators";

export const listRoutes = query({
  args: {
    status: v.optional(routeStatus),
    routeType: v.optional(routeType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const routes = args.status
      ? await ctx.db
          .query("routes")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("routes").collect();

    const filtered = args.routeType
      ? routes.filter((r) => r.routeType === args.routeType)
      : routes;

    filtered.sort((a, b) => a.riskScore - b.riskScore);
    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

export const getRoute = query({
  args: { routeId: v.id("routes") },
  handler: async (ctx, { routeId }) => {
    const route = await ctx.db.get(routeId);
    if (!route) return null;

    const roads = route.roadIds
      ? (await Promise.all(route.roadIds.map((id) => ctx.db.get(id)))).filter(
          (r): r is NonNullable<typeof r> => r !== null,
        )
      : [];

    return { ...route, roads };
  },
});

/**
 * Viable alternatives for a corridor: same origin and destination, not
 * blocked, ordered by risk. This is what the dashboard offers when a primary
 * route is invalidated.
 */
export const getAlternativeRoutes = query({
  args: {
    origin: v.string(),
    destination: v.string(),
    excludeRouteId: v.optional(v.id("routes")),
  },
  handler: async (ctx, { origin, destination, excludeRouteId }) => {
    const routes = await ctx.db.query("routes").collect();

    return routes
      .filter(
        (r) =>
          r.origin === origin &&
          r.destination === destination &&
          r.status !== "blocked" &&
          r._id !== excludeRouteId,
      )
      .sort((a, b) => a.riskScore - b.riskScore);
  },
});

export const createRoute = mutation({
  args: {
    name: v.string(),
    origin: v.string(),
    destination: v.string(),
    distance: v.number(),
    estimatedTime: v.number(),
    riskScore: v.number(),
    routeType: routeType,
    status: v.optional(routeStatus),
    geometry: v.optional(lineString),
    roadIds: v.optional(v.array(v.id("roads"))),
    /** Convenience: generate a curved polyline when no geometry is supplied. */
    startLat: v.optional(v.number()),
    startLng: v.optional(v.number()),
    endLat: v.optional(v.number()),
    endLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const {
      startLat,
      startLng,
      endLat,
      endLng,
      geometry,
      status,
      ...rest
    } = args;

    const resolvedGeometry =
      geometry ??
      (startLat !== undefined &&
      startLng !== undefined &&
      endLat !== undefined &&
      endLng !== undefined
        ? curvedLine(startLat, startLng, endLat, endLng)
        : undefined);

    const now = Date.now();
    const routeId = await ctx.db.insert("routes", {
      ...rest,
      status: status ?? "active",
      geometry: resolvedGeometry,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      eventType: "route_generated",
      category: "logistics",
      message: `${args.routeType === "emergency" ? "Emergency" : args.routeType === "safest" ? "Safest" : "Fastest"} route generated: ${args.origin} → ${args.destination} (${Math.round(args.distance)} km, risk ${Math.round(args.riskScore)}).`,
      relatedRoadId: args.roadIds?.[0],
    });

    return routeId;
  },
});

export const updateRouteStatus = mutation({
  args: {
    routeId: v.id("routes"),
    status: routeStatus,
  },
  handler: async (ctx, { routeId, status }) => {
    const route = await ctx.db.get(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);

    await ctx.db.patch(routeId, { status, updatedAt: Date.now() });

    if (route.status !== status) {
      await logActivity(ctx, {
        eventType: "route_generated",
        category: "logistics",
        message: `Route "${route.name}" is now ${status}.`,
        severity: status === "blocked" ? "high" : undefined,
      });
    }

    return routeId;
  },
});

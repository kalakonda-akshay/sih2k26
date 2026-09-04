import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { haversineKm, logActivity, RISK_RANK } from "./lib/helpers";
import {
  assessVehicleExposure,
  isDeliveryDelayed,
  INCIDENT_PROXIMITY_KM,
  RISK_ZONE_PROXIMITY_KM,
  type HazardIncident,
  type HazardPrediction,
  type VehicleExposure,
} from "./lib/vehicleRisk";

/**
 * Fleet intelligence — vehicle exposure, high-risk detection and delivery
 * delay handling.
 *
 * The scoring rules live in `lib/vehicleRisk.ts` as pure functions. This
 * module assembles the real inputs around each vehicle and persists the
 * consequences.
 */

/* ------------------------------------------------------------- internals */

interface FleetContext {
  incidents: Doc<"incidents">[];
  predictions: Doc<"riskPredictions">[];
  roads: Doc<"roads">[];
  deliveries: Doc<"deliveries">[];
  routes: Doc<"routes">[];
}

/** Latest prediction per location — the engine appends, it does not update. */
function latestPredictions(all: Doc<"riskPredictions">[]) {
  const latest = new Map<string, Doc<"riskPredictions">>();
  for (const p of all) {
    const seen = latest.get(p.locationName);
    if (!seen || p.createdAt > seen.createdAt) latest.set(p.locationName, p);
  }
  return [...latest.values()];
}

/** Corridor nearest the vehicle, measured to whichever end is closer. */
function nearestRoad(
  vehicle: Doc<"vehicles">,
  roads: Doc<"roads">[],
): { road: Doc<"roads">; distanceKm: number } | null {
  let best: { road: Doc<"roads">; distanceKm: number } | null = null;

  for (const road of roads) {
    const d = Math.min(
      haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        road.startLatitude,
        road.startLongitude,
      ),
      haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        road.endLatitude,
        road.endLongitude,
      ),
    );
    if (!best || d < best.distanceKm) best = { road, distanceKm: d };
  }

  return best;
}

/** Everything the exposure model needs about one vehicle. */
function buildExposure(
  vehicle: Doc<"vehicles">,
  ctx: FleetContext,
): {
  exposure: VehicleExposure;
  road: Doc<"roads"> | null;
  roadDistanceKm: number | null;
  delivery: Doc<"deliveries"> | null;
  route: Doc<"routes"> | null;
  nearbyIncidents: HazardIncident[];
  nearbyPredictions: HazardPrediction[];
} {
  const nearbyIncidents: HazardIncident[] = ctx.incidents
    .filter((i) => i.status === "active")
    .map((i) => ({
      severity: i.severity,
      incidentType: i.incidentType,
      locationName: i.locationName,
      distanceKm: haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        i.latitude,
        i.longitude,
      ),
    }))
    .filter((i) => i.distanceKm <= INCIDENT_PROXIMITY_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearbyPredictions: HazardPrediction[] = ctx.predictions
    .map((p) => ({
      riskLevel: p.riskLevel,
      predictedIssue: p.predictedIssue,
      locationName: p.locationName,
      distanceKm: haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        p.latitude,
        p.longitude,
      ),
    }))
    .filter((p) => p.distanceKm <= RISK_ZONE_PROXIMITY_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = nearestRoad(vehicle, ctx.roads);

  const delivery =
    ctx.deliveries.find(
      (d) =>
        d.vehicleId === vehicle._id &&
        (d.status === "in_transit" ||
          d.status === "delayed" ||
          d.status === "pending"),
    ) ?? null;

  const routeId = delivery?.currentRouteId ?? vehicle.currentRouteId;
  const route = routeId ? (ctx.routes.find((r) => r._id === routeId) ?? null) : null;

  const exposure = assessVehicleExposure({
    vehicleStatus: vehicle.status,
    roadStatus: nearest?.road.accessibilityStatus,
    roadNumber: nearest?.road.roadNumber,
    roadRiskLevel: nearest?.road.riskLevel,
    routeStatus: route?.status,
    routeName: route?.name,
    deliveryPriority: delivery?.priority,
    cargoType: delivery?.cargoType ?? vehicle.cargoType,
    incidents: nearbyIncidents,
    predictions: nearbyPredictions,
  });

  return {
    exposure,
    road: nearest?.road ?? null,
    roadDistanceKm: nearest?.distanceKm ?? null,
    delivery,
    route,
    nearbyIncidents,
    nearbyPredictions,
  };
}

/* ------------------------------------------------------------- overview */

/** The six headline fleet metrics, all derived from live data. */
export const getFleetOverview = query({
  args: {},
  handler: async (ctx) => {
    const [vehicles, incidents, predictions, roads, deliveries, routes] =
      await Promise.all([
        ctx.db.query("vehicles").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("routes").collect(),
      ]);

    const fleetCtx: FleetContext = {
      incidents,
      predictions: latestPredictions(predictions),
      roads,
      deliveries,
      routes,
    };

    let inHighRiskZone = 0;
    for (const vehicle of vehicles) {
      const { exposure } = buildExposure(vehicle, fleetCtx);
      if (RISK_RANK[exposure.riskLevel] >= RISK_RANK.high) inHighRiskZone += 1;
    }

    const criticalDeliveries = deliveries.filter(
      (d) =>
        (d.priority === "critical" || d.priority === "emergency") &&
        d.status !== "delivered" &&
        d.status !== "cancelled",
    ).length;

    return {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v) => v.status === "active").length,
      delayedVehicles: vehicles.filter((v) => v.status === "delayed").length,
      emergencyVehicles: vehicles.filter((v) => v.status === "emergency").length,
      idleVehicles: vehicles.filter((v) => v.status === "idle").length,
      offlineVehicles: vehicles.filter((v) => v.status === "offline").length,
      inHighRiskZone,
      criticalDeliveries,
      activeDeliveries: deliveries.filter(
        (d) => d.status === "in_transit" || d.status === "delayed",
      ).length,
      delayedDeliveries: deliveries.filter((d) => d.status === "delayed").length,
    };
  },
});

/**
 * The full fleet, each vehicle joined to its active consignment and its
 * current exposure band.
 *
 * Returning the join from the server means the table can filter on delivery
 * priority and exposure without the client fetching deliveries separately and
 * stitching them together.
 */
export const listFleet = query({
  args: {},
  handler: async (ctx) => {
    const [vehicles, incidents, predictions, roads, deliveries, routes] =
      await Promise.all([
        ctx.db.query("vehicles").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("routes").collect(),
      ]);

    const fleetCtx: FleetContext = {
      incidents,
      predictions: latestPredictions(predictions),
      roads,
      deliveries,
      routes,
    };

    return vehicles
      .map((vehicle) => {
        const built = buildExposure(vehicle, fleetCtx);
        return {
          _id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          cargoType: vehicle.cargoType,
          driverName: vehicle.driverName,
          driverPhone: vehicle.driverPhone,
          status: vehicle.status,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          speed: vehicle.speed,
          heading: vehicle.heading,
          destination: vehicle.destination,
          riskLevel: vehicle.riskLevel,
          lastUpdated: vehicle.lastUpdated,
          exposureLevel: built.exposure.riskLevel,
          reasonCount: built.exposure.reasons.length,
          deliveryPriority: built.delivery?.priority ?? null,
          deliveryStatus: built.delivery?.status ?? null,
          deliveryProgress: built.delivery?.progress ?? null,
          roadNumber: built.road?.roadNumber ?? null,
          roadStatus: built.road?.accessibilityStatus ?? null,
          state: built.road?.state ?? null,
          district: built.road?.district ?? null,
        };
      })
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  },
});

/* -------------------------------------------------- high-risk detection */

/**
 * Vehicles the control room should look at, with the reasons why.
 *
 * Exposure is straight-line proximity, not road-network distance — see
 * `lib/vehicleRisk.ts` for why that is deliberate and what it costs.
 */
export const getHighRiskVehicles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const [vehicles, incidents, predictions, roads, deliveries, routes] =
      await Promise.all([
        ctx.db.query("vehicles").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("routes").collect(),
      ]);

    const fleetCtx: FleetContext = {
      incidents,
      predictions: latestPredictions(predictions),
      roads,
      deliveries,
      routes,
    };

    const rows = vehicles
      .map((vehicle) => {
        const built = buildExposure(vehicle, fleetCtx);
        return {
          _id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          cargoType: vehicle.cargoType,
          status: vehicle.status,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          speed: vehicle.speed,
          destination: vehicle.destination,
          driverName: vehicle.driverName,
          lastUpdated: vehicle.lastUpdated,
          exposureLevel: built.exposure.riskLevel,
          reasons: built.exposure.reasons,
          nearestIncidentKm: built.exposure.nearestIncidentKm,
          roadNumber: built.road?.roadNumber ?? null,
          roadStatus: built.road?.accessibilityStatus ?? null,
          deliveryPriority: built.delivery?.priority ?? null,
          routeStatus: built.route?.status ?? null,
        };
      })
      .filter((row) => RISK_RANK[row.exposureLevel] >= RISK_RANK.moderate)
      .sort((a, b) => {
        const r = RISK_RANK[b.exposureLevel] - RISK_RANK[a.exposureLevel];
        if (r !== 0) return r;
        return (a.nearestIncidentKm ?? 1e9) - (b.nearestIncidentKm ?? 1e9);
      });

    return limit ? rows.slice(0, limit) : rows;
  },
});

/* ---------------------------------------------------------- detail view */

/** Everything the vehicle detail panel needs, in one subscription. */
export const getVehicleDetail = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, { vehicleId }) => {
    const vehicle = await ctx.db.get(vehicleId);
    if (!vehicle) return null;

    const [incidents, predictions, roads, deliveries, routes, activity] =
      await Promise.all([
        ctx.db.query("incidents").collect(),
        ctx.db.query("riskPredictions").collect(),
        ctx.db.query("roads").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db.query("routes").collect(),
        ctx.db
          .query("activityLog")
          .withIndex("by_createdAt")
          .order("desc")
          .take(400),
      ]);

    const built = buildExposure(vehicle, {
      incidents,
      predictions: latestPredictions(predictions),
      roads,
      deliveries,
      routes,
    });

    // The vehicle's own history, reusing the shared activity log rather than
    // introducing a second per-vehicle event table.
    const timeline = activity
      .filter(
        (entry) =>
          entry.relatedVehicleId === vehicleId ||
          (built.delivery !== null &&
            entry.relatedDeliveryId === built.delivery._id),
      )
      .slice(0, 25);

    return {
      vehicle,
      exposure: built.exposure,
      road: built.road,
      roadDistanceKm: built.roadDistanceKm,
      delivery: built.delivery,
      route: built.route,
      nearbyIncidents: built.nearbyIncidents.slice(0, 6),
      nearbyPredictions: built.nearbyPredictions.slice(0, 6),
      timeline,
    };
  },
});

/**
 * Every consignment joined to its vehicle and route.
 *
 * The delivery table needs the vehicle registration and the route status on
 * every row; joining server-side keeps that to one subscription instead of
 * one query per row.
 */
export const listDeliveriesDetailed = query({
  args: {},
  handler: async (ctx) => {
    const [deliveries, vehicles, routes] = await Promise.all([
      ctx.db.query("deliveries").collect(),
      ctx.db.query("vehicles").collect(),
      ctx.db.query("routes").collect(),
    ]);

    const vehicleById = new Map(vehicles.map((v) => [v._id, v]));
    const routeById = new Map(routes.map((r) => [r._id, r]));

    const priorityRank: Record<string, number> = {
      emergency: 4,
      critical: 3,
      high: 2,
      normal: 1,
    };
    const statusRank: Record<string, number> = {
      delayed: 4,
      in_transit: 3,
      pending: 2,
      delivered: 1,
      cancelled: 0,
    };

    return deliveries
      .map((d) => {
        const vehicle = vehicleById.get(d.vehicleId) ?? null;
        const route = d.currentRouteId
          ? (routeById.get(d.currentRouteId) ?? null)
          : null;

        return {
          _id: d._id,
          cargoType: d.cargoType,
          priority: d.priority,
          origin: d.origin,
          destination: d.destination,
          status: d.status,
          estimatedArrival: d.estimatedArrival,
          actualArrival: d.actualArrival ?? null,
          progress: d.progress ?? null,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          vehicleId: d.vehicleId,
          vehicleNumber: vehicle?.vehicleNumber ?? null,
          vehicleStatus: vehicle?.status ?? null,
          driverName: vehicle?.driverName ?? null,
          routeName: route?.name ?? null,
          routeStatus: route?.status ?? null,
        };
      })
      .sort((a, b) => {
        const s = (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0);
        if (s !== 0) return s;
        const p =
          (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
        if (p !== 0) return p;
        return a.estimatedArrival - b.estimatedArrival;
      });
  },
});

/* -------------------------------------------------- delay detection */

/**
 * Flag overdue consignments and raise one alert each.
 *
 * Duplicate suppression uses `dedupeKey = delivery:<id>:delayed`, the same
 * mechanism the risk engine uses. Running this repeatedly — which the demo
 * console does — marks nothing twice and raises no second alert.
 */
export const detectDeliveryDelays = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [deliveries, vehicles, activeAlerts] = await Promise.all([
      ctx.db.query("deliveries").collect(),
      ctx.db.query("vehicles").collect(),
      ctx.db
        .query("alerts")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
    ]);

    const vehicleById = new Map(vehicles.map((v) => [v._id, v]));
    const existingKeys = new Set(
      activeAlerts.map((a) => a.dedupeKey).filter(Boolean) as string[],
    );

    let flagged = 0;
    let alertsRaised = 0;

    for (const delivery of deliveries) {
      const vehicle = vehicleById.get(delivery.vehicleId);
      if (!vehicle) continue;

      const { delayed, reason } = isDeliveryDelayed({
        status: delivery.status,
        estimatedArrival: delivery.estimatedArrival,
        now,
        vehicleStatus: vehicle.status,
        vehicleRiskLevel: vehicle.riskLevel,
      });

      if (!delayed) continue;

      if (delivery.status !== "delayed") {
        await ctx.db.patch(delivery._id, {
          status: "delayed",
          updatedAt: now,
        });
        flagged += 1;

        await logActivity(ctx, {
          eventType: "delivery_update",
          category: "logistics",
          message: `Consignment to ${delivery.destination} marked delayed — ${reason}`,
          severity:
            delivery.priority === "emergency" || delivery.priority === "critical"
              ? "critical"
              : "high",
          relatedDeliveryId: delivery._id,
          relatedVehicleId: vehicle._id,
          createdAt: now,
        });
      }

      const dedupeKey = `delivery:${delivery._id}:delayed`;
      if (existingKeys.has(dedupeKey)) continue;

      const isPriority =
        delivery.priority === "emergency" || delivery.priority === "critical";

      await ctx.db.insert("alerts", {
        title: `${isPriority ? "Priority" : "Consignment"} delay — ${delivery.destination}`,
        message: `${delivery.cargoType} consignment on ${vehicle.vehicleNumber} (${delivery.origin} → ${delivery.destination}) is delayed. ${reason}`,
        alertType: "vehicle_delay",
        severity: isPriority ? "critical" : "high",
        status: "active",
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        locationName: delivery.destination,
        relatedVehicleId: vehicle._id,
        recommendedAction: isPriority
          ? "Evaluate an alternative route immediately and consider reassigning the consignment to the nearest available vehicle."
          : "Evaluate an alternative route and update the estimated arrival.",
        dedupeKey,
        createdAt: now,
      });
      existingKeys.add(dedupeKey);
      alertsRaised += 1;
    }

    return { flagged, alertsRaised, checked: deliveries.length };
  },
});

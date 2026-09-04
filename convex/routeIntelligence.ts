import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { haversineKm, logActivity } from "./lib/helpers";
import { deliveryPriority } from "./lib/validators";
import {
  buildGraph,
  explainRoute,
  findRouteOptions,
  PRIORITY_PROFILE,
  reachableFrom,
  type GraphEdge,
  type RoutePath,
} from "./lib/routeGraph";

/**
 * Route intelligence.
 *
 * Corridor-level path selection over the monitored road network. See
 * `lib/routeGraph.ts` for the cost model and for what this deliberately is
 * not — it is not turn-by-turn navigation, and nothing here claims to be.
 */

/** Assemble graph edges from roads, attributing active incidents to segments. */
function toEdges(
  roads: Doc<"roads">[],
  incidents: Doc<"incidents">[],
): GraphEdge[] {
  const active = incidents.filter((i) => i.status === "active");

  return roads
    .filter((r) => r.startNode && r.endNode)
    .map((road) => {
      // An incident counts against a segment if it is linked to it, or if it
      // sits within 20 km of either endpoint (field reports often predate the
      // link being made).
      const onSegment = active.filter((incident) => {
        if (incident.roadId === road._id) return true;
        const nearStart = haversineKm(
          incident.latitude,
          incident.longitude,
          road.startLatitude,
          road.startLongitude,
        );
        const nearEnd = haversineKm(
          incident.latitude,
          incident.longitude,
          road.endLatitude,
          road.endLongitude,
        );
        return Math.min(nearStart, nearEnd) <= 20;
      });

      return {
        roadId: road._id,
        roadNumber: road.roadNumber,
        roadName: road.roadName,
        from: road.startNode!,
        to: road.endNode!,
        lengthKm:
          road.lengthKm ??
          Math.round(
            haversineKm(
              road.startLatitude,
              road.startLongitude,
              road.endLatitude,
              road.endLongitude,
            ),
          ),
        riskScore: road.riskScore,
        riskLevel: road.riskLevel,
        accessibilityStatus: road.accessibilityStatus,
        district: road.district,
        state: road.state,
        incidentCount: onSegment.length,
        criticalIncidentCount: onSegment.filter(
          (i) => i.severity === "critical",
        ).length,
      };
    });
}

/** Serialise a path for the client, including per-segment detail. */
function serialise(path: RoutePath) {
  return {
    nodes: path.nodes,
    totalDistanceKm: path.totalDistanceKm,
    totalCost: path.totalCost,
    segmentCount: path.segmentCount,
    averageRiskScore: path.averageRiskScore,
    maxRiskScore: path.maxRiskScore,
    incidentCount: path.incidentCount,
    criticalIncidentCount: path.criticalIncidentCount,
    restrictedSegments: path.restrictedSegments,
    worstAccessibility: path.worstAccessibility,
    segments: path.edges.map((e) => ({
      roadId: e.roadId,
      roadNumber: e.roadNumber,
      roadName: e.roadName,
      from: e.from,
      to: e.to,
      lengthKm: e.lengthKm,
      riskScore: e.riskScore,
      riskLevel: e.riskLevel,
      accessibilityStatus: e.accessibilityStatus,
      district: e.district,
      incidentCount: e.incidentCount,
    })),
  };
}

/* ------------------------------------------------------------ network */

/** Nodes available as an origin or destination, with reachability. */
export const getNetworkNodes = query({
  args: {},
  handler: async (ctx) => {
    const [roads, incidents] = await Promise.all([
      ctx.db.query("roads").collect(),
      ctx.db.query("incidents").collect(),
    ]);

    const edges = toEdges(roads, incidents);
    const openGraph = buildGraph(edges);
    const fullGraph = buildGraph(edges, { includeBlocked: true });

    // Connected components of the *open* network, so the UI can warn that a
    // pair is unreachable before the user asks for a route.
    const components: string[][] = [];
    const assigned = new Set<string>();
    for (const node of openGraph.nodes) {
      if (assigned.has(node)) continue;
      const component = [...reachableFrom(openGraph, node)].sort();
      for (const n of component) assigned.add(n);
      components.push(component);
    }

    return {
      nodes: fullGraph.nodes,
      openNodes: openGraph.nodes,
      components,
      totalSegments: edges.length,
      routableSegments: edges.filter(
        (e) => e.accessibilityStatus !== "blocked",
      ).length,
      blockedSegments: edges.filter(
        (e) => e.accessibilityStatus === "blocked",
      ).length,
      unmappedSegments: roads.length - edges.length,
    };
  },
});

/* ------------------------------------------------------ route options */

export const getRouteOptions = query({
  args: {
    origin: v.string(),
    destination: v.string(),
    priority: v.optional(deliveryPriority),
  },
  handler: async (ctx, { origin, destination, priority = "normal" }) => {
    const [roads, incidents] = await Promise.all([
      ctx.db.query("roads").collect(),
      ctx.db.query("incidents").collect(),
    ]);

    const edges = toEdges(roads, incidents);
    const graph = buildGraph(edges);
    const graphWithBlocked = buildGraph(edges, { includeBlocked: true });

    if (origin === destination) {
      return {
        status: "invalid" as const,
        message: "Origin and destination are the same.",
        origin,
        destination,
        priority,
        options: [],
        reasons: [],
        blockedPathExists: false,
      };
    }

    if (!graphWithBlocked.adjacency.has(origin)) {
      return {
        status: "unknown_node" as const,
        message: `${origin} is not on the monitored corridor network.`,
        origin,
        destination,
        priority,
        options: [],
        reasons: [],
        blockedPathExists: false,
      };
    }
    if (!graphWithBlocked.adjacency.has(destination)) {
      return {
        status: "unknown_node" as const,
        message: `${destination} is not on the monitored corridor network.`,
        origin,
        destination,
        priority,
        options: [],
        reasons: [],
        blockedPathExists: false,
      };
    }

    const options = findRouteOptions(graph, origin, destination, priority, 3);

    if (options.length === 0) {
      // Distinguish "closed by a blockage" from "never connected at all" —
      // they call for completely different operational responses.
      const withBlocked = findRouteOptions(
        graphWithBlocked,
        origin,
        destination,
        priority,
        1,
      );

      if (withBlocked.length > 0) {
        const blockedSegments = withBlocked[0].edges.filter(
          (e) => e.accessibilityStatus === "blocked",
        );
        return {
          status: "severed" as const,
          message: `No open route exists from ${origin} to ${destination}. The only connecting path runs through ${blockedSegments.map((e) => e.roadNumber).join(", ")}, currently blocked.`,
          origin,
          destination,
          priority,
          options: [],
          reasons: [],
          blockedPathExists: true,
          blockedBy: blockedSegments.map((e) => ({
            roadNumber: e.roadNumber,
            roadName: e.roadName,
            district: e.district,
          })),
        };
      }

      return {
        status: "disconnected" as const,
        message: `${origin} and ${destination} are not connected on the monitored network. This is a gap in the corridor data, not a closure — the two locations sit in separate components of the graph.`,
        origin,
        destination,
        priority,
        options: [],
        reasons: [],
        blockedPathExists: false,
      };
    }

    const recommended = options[0];
    const runnerUp = options[1] ?? null;
    const reasons = explainRoute(recommended, runnerUp, priority);

    return {
      status: "ok" as const,
      message: null,
      origin,
      destination,
      priority,
      priorityProfile: PRIORITY_PROFILE[priority].label,
      options: options.map((path, index) => ({
        ...serialise(path),
        rank: index,
        recommended: index === 0,
        label:
          index === 0
            ? "Recommended"
            : index === 1
              ? "Alternative A"
              : "Alternative B",
      })),
      reasons,
      blockedPathExists: false,
    };
  },
});

/* --------------------------------------------- vehicle route intelligence */

/**
 * Route picture for one vehicle: where it is, where it is going, whether the
 * corridor ahead is viable, and what to do if it is not.
 */
export const getVehicleRouteIntelligence = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, { vehicleId }) => {
    const vehicle = await ctx.db.get(vehicleId);
    if (!vehicle) return null;

    const [roads, incidents, deliveries] = await Promise.all([
      ctx.db.query("roads").collect(),
      ctx.db.query("incidents").collect(),
      ctx.db.query("deliveries").collect(),
    ]);

    const delivery =
      deliveries.find(
        (d) =>
          d.vehicleId === vehicleId &&
          d.status !== "delivered" &&
          d.status !== "cancelled",
      ) ?? null;

    const priority = delivery?.priority ?? "normal";
    const edges = toEdges(roads, incidents);
    const graph = buildGraph(edges);
    const graphWithBlocked = buildGraph(edges, { includeBlocked: true });

    // Origin is the network node nearest the vehicle's live position.
    let origin: string | null = null;
    let bestDistance = Infinity;
    for (const road of roads) {
      if (!road.startNode || !road.endNode) continue;
      const dStart = haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        road.startLatitude,
        road.startLongitude,
      );
      const dEnd = haversineKm(
        vehicle.latitude,
        vehicle.longitude,
        road.endLatitude,
        road.endLongitude,
      );
      if (dStart < bestDistance) {
        bestDistance = dStart;
        origin = road.startNode;
      }
      if (dEnd < bestDistance) {
        bestDistance = dEnd;
        origin = road.endNode;
      }
    }

    const destination = vehicle.destination;

    if (!origin || !graphWithBlocked.adjacency.has(destination)) {
      return {
        vehicle,
        delivery,
        priority,
        origin,
        destination,
        originDistanceKm: Math.round(bestDistance),
        status: "unroutable" as const,
        message: `${destination} is not on the monitored corridor network, so no corridor-level route can be computed.`,
        options: [],
        reasons: [],
        disrupted: false,
      };
    }

    const options = findRouteOptions(graph, origin, destination, priority, 3);
    const blockedPath = findRouteOptions(
      graphWithBlocked,
      origin,
      destination,
      priority,
      1,
    )[0];

    // Disrupted when the shortest path ignoring closures uses a blocked
    // segment — i.e. the natural route is cut.
    const disrupted =
      blockedPath?.edges.some((e) => e.accessibilityStatus === "blocked") ??
      false;

    if (options.length === 0) {
      return {
        vehicle,
        delivery,
        priority,
        origin,
        destination,
        originDistanceKm: Math.round(bestDistance),
        status: disrupted ? ("severed" as const) : ("disconnected" as const),
        message: disrupted
          ? `Every connecting corridor from ${origin} to ${destination} is currently blocked.`
          : `${origin} and ${destination} are not connected on the monitored network.`,
        options: [],
        reasons: [],
        disrupted,
      };
    }

    return {
      vehicle,
      delivery,
      priority,
      origin,
      destination,
      originDistanceKm: Math.round(bestDistance),
      status: "ok" as const,
      message: null,
      disrupted,
      options: options.map((path, index) => ({
        ...serialise(path),
        rank: index,
        recommended: index === 0,
        label: index === 0 ? "Recommended" : `Alternative ${index}`,
      })),
      reasons: explainRoute(options[0], options[1] ?? null, priority),
    };
  },
});

/* ------------------------------------------------------- disruptions */

/**
 * Vehicles whose corridor to destination is cut by a closure, with the
 * alternative the engine would take instead.
 */
export const getRouteDisruptions = query({
  args: {},
  handler: async (ctx) => {
    const [roads, incidents, vehicles, deliveries] = await Promise.all([
      ctx.db.query("roads").collect(),
      ctx.db.query("incidents").collect(),
      ctx.db.query("vehicles").collect(),
      ctx.db.query("deliveries").collect(),
    ]);

    const edges = toEdges(roads, incidents);
    const graph = buildGraph(edges);
    const graphWithBlocked = buildGraph(edges, { includeBlocked: true });

    const rows = [];

    for (const vehicle of vehicles) {
      if (vehicle.status === "offline") continue;

      const delivery =
        deliveries.find(
          (d) =>
            d.vehicleId === vehicle._id &&
            d.status !== "delivered" &&
            d.status !== "cancelled",
        ) ?? null;
      const priority = delivery?.priority ?? "normal";

      let origin: string | null = null;
      let best = Infinity;
      for (const road of roads) {
        if (!road.startNode || !road.endNode) continue;
        const dS = haversineKm(
          vehicle.latitude,
          vehicle.longitude,
          road.startLatitude,
          road.startLongitude,
        );
        const dE = haversineKm(
          vehicle.latitude,
          vehicle.longitude,
          road.endLatitude,
          road.endLongitude,
        );
        if (dS < best) { best = dS; origin = road.startNode; }
        if (dE < best) { best = dE; origin = road.endNode; }
      }

      if (!origin || !graphWithBlocked.adjacency.has(vehicle.destination)) {
        continue;
      }

      const natural = findRouteOptions(
        graphWithBlocked,
        origin,
        vehicle.destination,
        priority,
        1,
      )[0];
      if (!natural) continue;

      const blockedOnPath = natural.edges.filter(
        (e) => e.accessibilityStatus === "blocked",
      );
      if (blockedOnPath.length === 0) continue;

      const alternative = findRouteOptions(
        graph,
        origin,
        vehicle.destination,
        priority,
        1,
      )[0];

      rows.push({
        vehicleId: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        cargoType: vehicle.cargoType,
        status: vehicle.status,
        origin,
        destination: vehicle.destination,
        priority,
        blockedBy: blockedOnPath.map((e) => ({
          roadNumber: e.roadNumber,
          roadName: e.roadName,
          district: e.district,
        })),
        alternative: alternative ? serialise(alternative) : null,
        hasAlternative: Boolean(alternative),
      });
    }

    // Priority loads first — those are the decisions that matter.
    const rank: Record<string, number> = {
      emergency: 4, critical: 3, high: 2, normal: 1,
    };
    rows.sort((a, b) => (rank[b.priority] ?? 0) - (rank[a.priority] ?? 0));

    return rows;
  },
});

/**
 * Raise a route-disruption alert for each affected priority consignment.
 *
 * Deduplicated on `route:<vehicleId>:disrupted`, the same mechanism the risk
 * engine and delay detector use, so repeated runs never spam the centre.
 */
export const detectRouteDisruptions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [roads, incidents, vehicles, deliveries, activeAlerts] =
      await Promise.all([
        ctx.db.query("roads").collect(),
        ctx.db.query("incidents").collect(),
        ctx.db.query("vehicles").collect(),
        ctx.db.query("deliveries").collect(),
        ctx.db
          .query("alerts")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .collect(),
      ]);

    const edges = toEdges(roads, incidents);
    const graph = buildGraph(edges);
    const graphWithBlocked = buildGraph(edges, { includeBlocked: true });
    const existingKeys = new Set(
      activeAlerts.map((a) => a.dedupeKey).filter(Boolean) as string[],
    );

    let raised = 0;
    let checked = 0;

    for (const vehicle of vehicles) {
      if (vehicle.status === "offline") continue;

      const delivery = deliveries.find(
        (d) =>
          d.vehicleId === vehicle._id &&
          d.status !== "delivered" &&
          d.status !== "cancelled",
      );
      const priority = delivery?.priority ?? "normal";
      // Only priority loads warrant an alert; everything else shows in the UI.
      if (priority !== "critical" && priority !== "emergency") continue;
      checked += 1;

      let origin: string | null = null;
      let best = Infinity;
      for (const road of roads) {
        if (!road.startNode || !road.endNode) continue;
        const dS = haversineKm(vehicle.latitude, vehicle.longitude, road.startLatitude, road.startLongitude);
        const dE = haversineKm(vehicle.latitude, vehicle.longitude, road.endLatitude, road.endLongitude);
        if (dS < best) { best = dS; origin = road.startNode; }
        if (dE < best) { best = dE; origin = road.endNode; }
      }
      if (!origin || !graphWithBlocked.adjacency.has(vehicle.destination)) continue;

      const natural = findRouteOptions(graphWithBlocked, origin, vehicle.destination, priority, 1)[0];
      if (!natural) continue;

      const blockedOnPath = natural.edges.filter(
        (e) => e.accessibilityStatus === "blocked",
      );
      if (blockedOnPath.length === 0) continue;

      const dedupeKey = `route:${vehicle._id}:disrupted`;
      if (existingKeys.has(dedupeKey)) continue;

      const alternative = findRouteOptions(graph, origin, vehicle.destination, priority, 1)[0];

      const alertId = await ctx.db.insert("alerts", {
        title: `Route disruption — ${vehicle.vehicleNumber}`,
        message: `${priority.toUpperCase()} ${vehicle.cargoType} consignment to ${vehicle.destination} is routed through ${blockedOnPath.map((e) => e.roadNumber).join(", ")}, currently blocked. ${
          alternative
            ? `An alternative exists via ${alternative.nodes.join(" → ")} at roughly ${alternative.totalDistanceKm} km.`
            : "No open alternative corridor exists on the monitored network."
        }`,
        alertType: "road_blockage",
        severity: "critical",
        status: "active",
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        locationName: vehicle.destination,
        relatedVehicleId: vehicle._id,
        relatedRoadId: blockedOnPath[0].roadId as Doc<"roads">["_id"],
        recommendedAction: alternative
          ? `Re-route via ${alternative.nodes.join(" → ")} (${alternative.totalDistanceKm} km, average risk ${alternative.averageRiskScore}/100).`
          : "No open corridor available — consider air-lift or hold the consignment until clearance.",
        dedupeKey,
        createdAt: now,
      });
      existingKeys.add(dedupeKey);
      raised += 1;

      await logActivity(ctx, {
        eventType: "route_generated",
        category: "logistics",
        message: `Route disruption detected for ${vehicle.vehicleNumber}${alternative ? " — alternative corridor identified" : " — no alternative available"}.`,
        severity: "critical",
        relatedVehicleId: vehicle._id,
        relatedAlertId: alertId,
        createdAt: now,
      });
    }

    return { raised, checked };
  },
});

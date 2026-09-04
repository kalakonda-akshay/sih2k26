import type { AccessibilityStatus, DeliveryPriority, RiskLevel } from "./validators";

/**
 * Road-network graph and route search (pure functions).
 *
 * ## What this is, precisely
 *
 * A weighted graph over the monitored corridor network. Nodes are named
 * locations (district headquarters and logistics hubs); edges are the road
 * segments between them. Path search is **Dijkstra** over a cost function
 * that combines distance, risk and accessibility.
 *
 * ## What this is NOT
 *
 * This is **corridor-level path selection, not turn-by-turn navigation**.
 * The graph has tens of nodes, not the millions in a real road network, and
 * an edge represents an entire highway between two towns rather than a
 * street. It answers "which corridors should this consignment use", never
 * "turn left in 200 metres". Nothing here should be presented as GPS
 * navigation.
 *
 * ## Cost model
 *
 *   traversalCost = lengthKm × riskMultiplier + accessibilityPenalty
 *   riskMultiplier = 1 + α × (riskScore / 100)
 *
 * α and the accessibility penalty both scale with delivery priority, so a
 * critical medicine load is more willing to accept extra distance to avoid
 * a risky corridor than a routine one is. Blocked segments are removed from
 * the graph entirely rather than penalised — a closed road is not expensive,
 * it is unavailable.
 */

export interface GraphEdge {
  roadId: string;
  roadNumber: string;
  roadName: string;
  from: string;
  to: string;
  lengthKm: number;
  riskScore: number;
  riskLevel: RiskLevel;
  accessibilityStatus: AccessibilityStatus;
  district: string;
  state: string;
  /** Active incidents attributed to this segment. */
  incidentCount: number;
  criticalIncidentCount: number;
}

export interface RouteGraph {
  /** node -> edges leaving it (undirected: each road appears at both ends). */
  adjacency: Map<string, GraphEdge[]>;
  nodes: string[];
}

/* --------------------------------------------------------- cost model */

/** How strongly each priority weights risk over distance. */
export const PRIORITY_PROFILE: Record<
  DeliveryPriority,
  { alpha: number; restrictedPenaltyKm: number; label: string }
> = {
  normal: {
    alpha: 1.0,
    restrictedPenaltyKm: 20,
    label: "Balances distance against risk.",
  },
  high: {
    alpha: 1.6,
    restrictedPenaltyKm: 40,
    label: "Leans toward safer corridors.",
  },
  critical: {
    alpha: 2.5,
    restrictedPenaltyKm: 80,
    label: "Strongly avoids risk and restrictions, accepting extra distance.",
  },
  emergency: {
    alpha: 3.0,
    restrictedPenaltyKm: 120,
    label: "Maximally risk-averse — accessibility outweighs distance.",
  },
};

/** Extra cost, in km-equivalents, for each active incident on a segment. */
const INCIDENT_PENALTY_KM = 15;
const CRITICAL_INCIDENT_PENALTY_KM = 45;

export function traversalCost(
  edge: GraphEdge,
  priority: DeliveryPriority,
): number {
  const profile = PRIORITY_PROFILE[priority];
  const riskMultiplier = 1 + profile.alpha * (edge.riskScore / 100);

  const accessibilityPenalty =
    edge.accessibilityStatus === "restricted" ? profile.restrictedPenaltyKm : 0;

  const incidentPenalty =
    edge.incidentCount * INCIDENT_PENALTY_KM +
    edge.criticalIncidentCount * CRITICAL_INCIDENT_PENALTY_KM;

  return edge.lengthKm * riskMultiplier + accessibilityPenalty + incidentPenalty;
}

/* ------------------------------------------------------- graph building */

/**
 * Build the graph.
 *
 * Blocked segments are excluded outright: a closed corridor is not a costly
 * option, it is not an option. Segments missing graph endpoints are skipped
 * rather than guessed at.
 */
export function buildGraph(
  edges: GraphEdge[],
  options: { includeBlocked?: boolean } = {},
): RouteGraph {
  const adjacency = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    if (!edge.from || !edge.to) continue;
    if (!options.includeBlocked && edge.accessibilityStatus === "blocked") {
      continue;
    }
    if (!Number.isFinite(edge.lengthKm) || edge.lengthKm <= 0) continue;

    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);

    adjacency.get(edge.from)!.push(edge);
    // Undirected: the same segment is traversable in reverse.
    adjacency.get(edge.to)!.push({ ...edge, from: edge.to, to: edge.from });
  }

  return { adjacency, nodes: [...adjacency.keys()].sort() };
}

/* ------------------------------------------------------------ Dijkstra */

export interface RoutePath {
  nodes: string[];
  edges: GraphEdge[];
  totalCost: number;
  totalDistanceKm: number;
  maxRiskScore: number;
  averageRiskScore: number;
  segmentCount: number;
  incidentCount: number;
  criticalIncidentCount: number;
  restrictedSegments: number;
  worstAccessibility: AccessibilityStatus;
}

/**
 * Shortest path by traversal cost.
 *
 * A simple array-scan priority queue: with tens of nodes the heap overhead
 * would cost more than it saves, and the code stays readable.
 */
export function findShortestPath(
  graph: RouteGraph,
  origin: string,
  destination: string,
  priority: DeliveryPriority,
  penalisedRoadIds: Set<string> = new Set(),
): RoutePath | null {
  if (origin === destination) return null;
  if (!graph.adjacency.has(origin) || !graph.adjacency.has(destination)) {
    return null;
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: GraphEdge }>();
  const visited = new Set<string>();

  for (const node of graph.nodes) dist.set(node, Infinity);
  dist.set(origin, 0);

  while (visited.size < graph.nodes.length) {
    let current: string | null = null;
    let best = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) {
        best = d;
        current = node;
      }
    }
    if (current === null || best === Infinity) break;
    if (current === destination) break;

    visited.add(current);

    for (const edge of graph.adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      // Alternative search penalises edges already used by a better route.
      const multiplier = penalisedRoadIds.has(edge.roadId) ? 4 : 1;
      const next = best + traversalCost(edge, priority) * multiplier;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, { node: current, edge });
      }
    }
  }

  if (!prev.has(destination) && origin !== destination) return null;

  // Walk back from the destination.
  const nodes: string[] = [destination];
  const edges: GraphEdge[] = [];
  let cursor = destination;
  const guard = new Set<string>();

  while (cursor !== origin) {
    const step = prev.get(cursor);
    if (!step || guard.has(cursor)) return null;
    guard.add(cursor);
    edges.unshift(step.edge);
    nodes.unshift(step.node);
    cursor = step.node;
  }

  return summarise(nodes, edges, priority);
}

function summarise(
  nodes: string[],
  edges: GraphEdge[],
  priority: DeliveryPriority,
): RoutePath {
  const totalDistanceKm = edges.reduce((sum, e) => sum + e.lengthKm, 0);
  const totalCost = edges.reduce((sum, e) => sum + traversalCost(e, priority), 0);
  const maxRiskScore = Math.max(0, ...edges.map((e) => e.riskScore));
  const averageRiskScore =
    edges.length === 0
      ? 0
      : Math.round(edges.reduce((s, e) => s + e.riskScore, 0) / edges.length);

  const worst: AccessibilityStatus = edges.some(
    (e) => e.accessibilityStatus === "blocked",
  )
    ? "blocked"
    : edges.some((e) => e.accessibilityStatus === "restricted")
      ? "restricted"
      : "accessible";

  return {
    nodes,
    edges,
    totalCost: Math.round(totalCost),
    totalDistanceKm: Math.round(totalDistanceKm),
    maxRiskScore: Math.round(maxRiskScore),
    averageRiskScore,
    segmentCount: edges.length,
    incidentCount: edges.reduce((s, e) => s + e.incidentCount, 0),
    criticalIncidentCount: edges.reduce(
      (s, e) => s + e.criticalIncidentCount,
      0,
    ),
    restrictedSegments: edges.filter(
      (e) => e.accessibilityStatus === "restricted",
    ).length,
    worstAccessibility: worst,
  };
}

/* ----------------------------------------------------- alternatives */

/**
 * Find up to `count` meaningfully different paths.
 *
 * Uses the **penalty method**: solve, then multiply the cost of the edges the
 * winner used and solve again. This is not Yen's algorithm and does not
 * guarantee the true k-shortest set, but it is bounded, cheap, and reliably
 * produces routes that differ by more than one segment — which is what an
 * operator actually needs. Identical paths are discarded.
 */
export function findRouteOptions(
  graph: RouteGraph,
  origin: string,
  destination: string,
  priority: DeliveryPriority,
  count = 3,
): RoutePath[] {
  const results: RoutePath[] = [];
  const penalised = new Set<string>();
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const path = findShortestPath(
      graph,
      origin,
      destination,
      priority,
      penalised,
    );
    if (!path) break;

    const signature = path.edges.map((e) => e.roadId).sort().join("|");
    if (seen.has(signature)) break;
    seen.add(signature);
    results.push(path);

    // Penalise this route's edges so the next search is pushed elsewhere.
    for (const edge of path.edges) penalised.add(edge.roadId);
  }

  // Best (lowest cost) first — the penalty method does not return them sorted.
  return results.sort((a, b) => a.totalCost - b.totalCost);
}

/* ---------------------------------------------------------- explanation */

export interface RouteReason {
  kind: "advantage" | "caution";
  text: string;
}

/**
 * Explain why the recommended route beat the alternative it is compared to.
 *
 * Comparative rather than absolute: "avoids two restricted segments the
 * alternative uses" is actionable in a way that "score 143" is not.
 */
export function explainRoute(
  recommended: RoutePath,
  comparedTo: RoutePath | null,
  priority: DeliveryPriority,
): RouteReason[] {
  const reasons: RouteReason[] = [];

  if (recommended.worstAccessibility === "accessible") {
    reasons.push({
      kind: "advantage",
      text: "Every segment on this route is currently open to traffic.",
    });
  }

  if (recommended.criticalIncidentCount === 0) {
    reasons.push({
      kind: "advantage",
      text: "No critical incident is recorded on any segment of this route.",
    });
  } else {
    reasons.push({
      kind: "caution",
      text: `${recommended.criticalIncidentCount} critical incident(s) affect segments on this route.`,
    });
  }

  if (recommended.restrictedSegments > 0) {
    reasons.push({
      kind: "caution",
      text: `${recommended.restrictedSegments} segment(s) are under movement restrictions.`,
    });
  }

  if (comparedTo) {
    const riskDelta = comparedTo.averageRiskScore - recommended.averageRiskScore;
    const distanceDelta =
      recommended.totalDistanceKm - comparedTo.totalDistanceKm;

    if (riskDelta > 2) {
      reasons.push({
        kind: "advantage",
        text: `Average corridor risk is ${riskDelta} points lower than the next option (${recommended.averageRiskScore} vs ${comparedTo.averageRiskScore} out of 100).`,
      });
    }

    if (distanceDelta > 0) {
      reasons.push({
        kind: "caution",
        text: `Roughly ${distanceDelta} km longer than the next option — accepted because ${PRIORITY_PROFILE[priority].label.toLowerCase()}`,
      });
    } else if (distanceDelta < 0) {
      reasons.push({
        kind: "advantage",
        text: `Also about ${Math.abs(distanceDelta)} km shorter than the next option.`,
      });
    }

    const avoided = comparedTo.edges.filter(
      (e) =>
        e.accessibilityStatus !== "accessible" &&
        !recommended.edges.some((r) => r.roadId === e.roadId),
    );
    if (avoided.length > 0) {
      reasons.push({
        kind: "advantage",
        text: `Avoids ${avoided.map((e) => e.roadNumber).join(", ")}, which the alternative uses despite being ${avoided[0].accessibilityStatus}.`,
      });
    }
  }

  reasons.push({
    kind: "advantage",
    text: `Priority profile: ${PRIORITY_PROFILE[priority].label}`,
  });

  return reasons;
}

/** Connected component containing `node` — used to explain "no path". */
export function reachableFrom(graph: RouteGraph, node: string): Set<string> {
  const seen = new Set<string>();
  if (!graph.adjacency.has(node)) return seen;

  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of graph.adjacency.get(current) ?? []) {
      if (!seen.has(edge.to)) stack.push(edge.to);
    }
  }
  return seen;
}

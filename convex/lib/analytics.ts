import { clamp } from "./helpers";

/**
 * Operational analytics — pure functions.
 *
 * ## Honesty note
 *
 * Nothing in this file is a machine learning model. The health score and the
 * insight detectors are **deterministic rules over real Convex data**: same
 * inputs, same output, every component attributable. The UI labels them as
 * such rather than presenting them as AI-generated.
 */

/* ------------------------------------------------------- time windows */

export const TIME_WINDOWS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
} as const;

export type TimeWindowKey = keyof typeof TIME_WINDOWS;

export function windowStart(key: TimeWindowKey, now: number): number {
  return now - TIME_WINDOWS[key] * 24 * 60 * 60 * 1000;
}

/** How many buckets a window is split into for trend charts. */
export function bucketCountFor(key: TimeWindowKey): number {
  return key === "24h" ? 12 : key === "7d" ? 7 : 15;
}

export interface Bucket {
  /** Start of the bucket, epoch ms. */
  start: number;
  end: number;
  count: number;
}

/**
 * Split a set of timestamps into evenly spaced buckets across the window.
 * Returns buckets oldest-first so a chart reads left to right.
 */
export function bucketTimestamps(
  timestamps: number[],
  from: number,
  to: number,
  bucketCount: number,
): Bucket[] {
  const span = Math.max(to - from, 1);
  const size = span / bucketCount;

  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    start: from + i * size,
    end: from + (i + 1) * size,
    count: 0,
  }));

  for (const ts of timestamps) {
    if (ts < from || ts > to) continue;
    const index = Math.min(
      bucketCount - 1,
      Math.floor((ts - from) / size),
    );
    buckets[index].count += 1;
  }

  return buckets;
}

/** Average a numeric series into the same bucket layout. */
export function bucketAverages(
  points: Array<{ ts: number; value: number }>,
  from: number,
  to: number,
  bucketCount: number,
): Array<{ start: number; end: number; value: number | null }> {
  const span = Math.max(to - from, 1);
  const size = span / bucketCount;

  const sums = Array.from({ length: bucketCount }, () => ({
    total: 0,
    n: 0,
  }));

  for (const p of points) {
    if (p.ts < from || p.ts > to) continue;
    const index = Math.min(bucketCount - 1, Math.floor((p.ts - from) / size));
    sums[index].total += p.value;
    sums[index].n += 1;
  }

  return sums.map((s, i) => ({
    start: from + i * size,
    end: from + (i + 1) * size,
    value: s.n === 0 ? null : Math.round(s.total / s.n),
  }));
}

/* ------------------------------------------------- operational health */

export interface HealthComponent {
  key:
    | "roadAccessibility"
    | "incidentLoad"
    | "vehicleAvailability"
    | "deliveryPerformance"
    | "criticalAlerts"
    | "predictedRisk";
  label: string;
  /** Points earned (higher is healthier). */
  score: number;
  /** Maximum this component can contribute. */
  max: number;
  explanation: string;
}

export type HealthBand = "healthy" | "strained" | "degraded" | "critical";

export interface HealthResult {
  score: number;
  band: HealthBand;
  components: HealthComponent[];
}

/**
 * Component caps. They sum to 100, so a component's cap is literally its
 * share of the health score — the same design as the risk engine's factors.
 */
export const HEALTH_CAPS = {
  roadAccessibility: 25,
  deliveryPerformance: 20,
  incidentLoad: 20,
  vehicleAvailability: 15,
  criticalAlerts: 10,
  predictedRisk: 10,
} as const;

export function healthBand(score: number): HealthBand {
  if (score >= 80) return "healthy";
  if (score >= 60) return "strained";
  if (score >= 40) return "degraded";
  return "critical";
}

export interface HealthInputs {
  totalRoads: number;
  accessibleRoads: number;
  restrictedRoads: number;
  blockedRoads: number;

  activeIncidents: number;
  criticalIncidents: number;

  totalVehicles: number;
  availableVehicles: number;
  offlineVehicles: number;

  totalActiveDeliveries: number;
  delayedDeliveries: number;

  unacknowledgedCriticalAlerts: number;

  /** 0-100 regional average from the risk engine. */
  averagePredictedRisk: number;
}

/**
 * NER Logistics Health Score, 0-100 — higher is healthier.
 *
 * Every component is a ratio of real counts, capped and explained. There is
 * no arbitrary constant anywhere: if the number moves, one of the six inputs
 * moved, and the panel says which.
 */
export function calculateOperationalHealth(
  input: HealthInputs,
): HealthResult {
  const components: HealthComponent[] = [];

  /* ------------------------------------------- road accessibility (25) */
  {
    const cap = HEALTH_CAPS.roadAccessibility;
    const total = Math.max(input.totalRoads, 1);
    // Restricted counts as half-open; blocked counts as zero.
    const openness =
      (input.accessibleRoads + input.restrictedRoads * 0.5) / total;
    const score = openness * cap;
    components.push({
      key: "roadAccessibility",
      label: "Road accessibility",
      score: round1(score),
      max: cap,
      explanation: `${input.accessibleRoads} of ${input.totalRoads} corridors fully open, ${input.restrictedRoads} restricted, ${input.blockedRoads} blocked.`,
    });
  }

  /* ---------------------------------------- delivery performance (20) */
  {
    const cap = HEALTH_CAPS.deliveryPerformance;
    const total = Math.max(input.totalActiveDeliveries, 1);
    const onTimeRatio =
      input.totalActiveDeliveries === 0
        ? 1
        : (input.totalActiveDeliveries - input.delayedDeliveries) / total;
    components.push({
      key: "deliveryPerformance",
      label: "Delivery performance",
      score: round1(clamp(onTimeRatio, 0, 1) * cap),
      max: cap,
      explanation:
        input.totalActiveDeliveries === 0
          ? "No consignments in flight."
          : `${input.totalActiveDeliveries - input.delayedDeliveries} of ${input.totalActiveDeliveries} consignments running to schedule.`,
    });
  }

  /* --------------------------------------------- incident load (20) */
  {
    const cap = HEALTH_CAPS.incidentLoad;
    // Weighted load: a critical incident costs as much as three ordinary ones.
    const load = input.activeIncidents + input.criticalIncidents * 2;
    // 12 weighted incidents is treated as a fully saturated region.
    const score = cap * (1 - clamp(load / 12, 0, 1));
    components.push({
      key: "incidentLoad",
      label: "Incident load",
      score: round1(score),
      max: cap,
      explanation: `${input.activeIncidents} active incident${input.activeIncidents === 1 ? "" : "s"}, ${input.criticalIncidents} of them critical.`,
    });
  }

  /* --------------------------------------- vehicle availability (15) */
  {
    const cap = HEALTH_CAPS.vehicleAvailability;
    const total = Math.max(input.totalVehicles, 1);
    const ratio = input.availableVehicles / total;
    components.push({
      key: "vehicleAvailability",
      label: "Vehicle availability",
      score: round1(clamp(ratio, 0, 1) * cap),
      max: cap,
      explanation: `${input.availableVehicles} of ${input.totalVehicles} vehicles available, ${input.offlineVehicles} offline.`,
    });
  }

  /* ------------------------------------------- critical alerts (10) */
  {
    const cap = HEALTH_CAPS.criticalAlerts;
    // Five unacknowledged criticals saturates this component.
    const score =
      cap * (1 - clamp(input.unacknowledgedCriticalAlerts / 5, 0, 1));
    components.push({
      key: "criticalAlerts",
      label: "Critical alerts",
      score: round1(score),
      max: cap,
      explanation:
        input.unacknowledgedCriticalAlerts === 0
          ? "No unacknowledged critical alerts."
          : `${input.unacknowledgedCriticalAlerts} critical alert${input.unacknowledgedCriticalAlerts === 1 ? "" : "s"} awaiting acknowledgement.`,
    });
  }

  /* --------------------------------------------- predicted risk (10) */
  {
    const cap = HEALTH_CAPS.predictedRisk;
    const score = cap * (1 - clamp(input.averagePredictedRisk / 100, 0, 1));
    components.push({
      key: "predictedRisk",
      label: "Predicted risk",
      score: round1(score),
      max: cap,
      explanation: `Regional average forecast risk is ${Math.round(input.averagePredictedRisk)}/100.`,
    });
  }

  const score = Math.round(
    clamp(
      components.reduce((sum, c) => sum + c.score, 0),
      0,
      100,
    ),
  );

  return { score, band: healthBand(score), components };
}

/* -------------------------------------------------- district health */

/**
 * Simplified per-district health, same 0-100 scale.
 *
 * Districts carry far less data than the region, so this uses four inputs
 * rather than six — averaging thin data across more components would produce
 * a falsely confident number.
 */
export function calculateDistrictHealth(input: {
  totalRoads: number;
  accessibleRoads: number;
  blockedRoads: number;
  activeIncidents: number;
  criticalAlerts: number;
  averagePredictedRisk: number;
}): number {
  const roadScore =
    input.totalRoads === 0
      ? 40
      : 40 * (input.accessibleRoads / input.totalRoads);

  const incidentScore = 25 * (1 - clamp(input.activeIncidents / 4, 0, 1));
  const alertScore = 15 * (1 - clamp(input.criticalAlerts / 3, 0, 1));
  const riskScore = 20 * (1 - clamp(input.averagePredictedRisk / 100, 0, 1));

  return Math.round(
    clamp(roadScore + incidentScore + alertScore + riskScore, 0, 100),
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

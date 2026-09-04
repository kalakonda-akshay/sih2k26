import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { RISK_THRESHOLDS } from "./constants";
import type {
  ActivityCategory,
  ActivityEventType,
  LineString,
  RiskLevel,
  Severity,
} from "./validators";

/* --------------------------------------------------------------- risk ---- */

/**
 * Map a 0-100 risk score onto its band. This is the only place the banding
 * logic lives; the seed, the mutations and the UI legend all call through it.
 */
export function riskLevelFromScore(score: number): RiskLevel {
  const s = clamp(score, 0, 100);
  // Inclusive upper bounds: 0-25 low, 26-50 moderate, 51-75 high, 76+ critical.
  if (s <= RISK_THRESHOLDS.low) return "low";
  if (s <= RISK_THRESHOLDS.moderate) return "moderate";
  if (s <= RISK_THRESHOLDS.high) return "high";
  return "critical";
}

/** Ordering weight for severity — highest first when sorting alerts. */
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Ordering weight for risk bands. */
export const RISK_RANK: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/* ----------------------------------------------------------- geometry ---- */

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Initial bearing in degrees (0 = north, clockwise). */
export function bearingDegrees(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(bLng - aLng);
  const y = Math.sin(dLng) * Math.cos(toRad(bLat));
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Linear interpolation between two points.
 * `t` is the fraction travelled (0 = at origin, 1 = at destination).
 */
export function interpolate(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  t: number,
): { lat: number; lng: number } {
  const f = clamp(t, 0, 1);
  return {
    lat: aLat + (bLat - aLat) * f,
    lng: aLng + (bLng - aLng) * f,
  };
}

/**
 * Build a GeoJSON LineString from an ordered list of points.
 * Note the GeoJSON axis order: [longitude, latitude].
 */
export function makeLineString(
  points: Array<{ lat: number; lng: number }>,
): LineString {
  return {
    type: "LineString",
    coordinates: points.map((p) => [p.lng, p.lat]),
  };
}

/**
 * A gently curved polyline between two points. Real mountain roads are never
 * straight; offsetting the midpoint perpendicular to the chord produces a
 * believable arc without needing real OSM geometry yet.
 */
export function curvedLine(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  curvature = 0.12,
  segments = 12,
): LineString {
  const midLat = (aLat + bLat) / 2;
  const midLng = (aLng + bLng) / 2;
  const offLat = -(bLng - aLng) * curvature;
  const offLng = (bLat - aLat) * curvature;
  const cLat = midLat + offLat;
  const cLng = midLng + offLng;

  const pts: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    // Quadratic Bezier through the offset control point.
    pts.push({
      lat: u * u * aLat + 2 * u * t * cLat + t * t * bLat,
      lng: u * u * aLng + 2 * u * t * cLng + t * t * bLng,
    });
  }
  return makeLineString(pts);
}

/* ----------------------------------------------------------- activity ---- */

export interface ActivityInput {
  eventType: ActivityEventType;
  category: ActivityCategory;
  message: string;
  severity?: Severity;
  relatedVehicleId?: Id<"vehicles">;
  relatedIncidentId?: Id<"incidents">;
  relatedAlertId?: Id<"alerts">;
  relatedRoadId?: Id<"roads">;
  relatedDeliveryId?: Id<"deliveries">;
  createdAt?: number;
}

/**
 * Append one entry to the operational activity feed.
 *
 * Called from mutations rather than from the frontend so the timeline records
 * what the *backend* actually did, not what a component happened to render.
 */
export async function logActivity(
  ctx: MutationCtx,
  input: ActivityInput,
): Promise<Id<"activityLog">> {
  return await ctx.db.insert("activityLog", {
    eventType: input.eventType,
    category: input.category,
    message: input.message,
    severity: input.severity,
    relatedVehicleId: input.relatedVehicleId,
    relatedIncidentId: input.relatedIncidentId,
    relatedAlertId: input.relatedAlertId,
    relatedRoadId: input.relatedRoadId,
    relatedDeliveryId: input.relatedDeliveryId,
    createdAt: input.createdAt ?? Date.now(),
  });
}

/* --------------------------------------------------------------- misc ---- */

/** Deterministic pseudo-random in [0,1) from an integer seed (repeatable). */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

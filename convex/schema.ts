import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  accessibilityStatus,
  activityCategory,
  activityEventType,
  alertStatus,
  alertType,
  cargoType,
  deliveryPriority,
  deliveryStatus,
  incidentStatus,
  incidentType,
  lineString,
  predictedIssueType,
  riskLevel,
  roadClass,
  routeStatus,
  routeType,
  severity,
  userRole,
  vehicleStatus,
  vehicleType,
  weatherAlertLevel,
  weatherCondition,
} from "./lib/validators";

/**
 * NER-Vision AI — Convex schema.
 *
 * Design notes
 * ------------
 * - Relationships use native Convex document ids (`v.id("table")`), never
 *   hand-rolled foreign keys.
 * - Convex supplies `_id` and `_creationTime` on every document. Explicit
 *   `createdAt` / `updatedAt` fields are kept anyway because the seed writes
 *   backdated timestamps to produce a believable operational history, which
 *   `_creationTime` (always "now") cannot express.
 * - Geometry is stored as GeoJSON LineString so the GIS layer can be upgraded
 *   later without a redesign.
 * - Indexes exist for every field the dashboard filters or sorts on, so no
 *   dashboard query ever performs a full table scan.
 */
export default defineSchema({
  /* ================================================================ users */
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: userRole,
    organization: v.optional(v.string()),
    phone: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    isActive: v.boolean(),
    /**
     * Reserved for future role-based auth (Convex Auth / Clerk / Auth0).
     * Left optional and unused in this phase so that wiring a provider later
     * is a pure addition — no migration, no backfill.
     */
    tokenIdentifier: v.optional(v.string()),
    /** District the officer is assigned to; scopes field-officer queries. */
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_role_and_isActive", ["role", "isActive"]),

  /* ============================================================= vehicles */
  vehicles: defineTable({
    vehicleNumber: v.string(),
    vehicleType: vehicleType,
    cargoType: cargoType,
    driverName: v.string(),
    driverPhone: v.string(),
    status: vehicleStatus,
    latitude: v.number(),
    longitude: v.number(),
    /** km/h */
    speed: v.number(),
    /** degrees, 0 = north, clockwise */
    heading: v.number(),
    destination: v.string(),
    currentRouteId: v.optional(v.id("routes")),
    /** Risk of the segment the vehicle is currently traversing. */
    riskLevel: riskLevel,
    /** Owning logistics operator — scopes the operator dashboard. */
    operatorId: v.optional(v.id("users")),
    capacityTonnes: v.optional(v.number()),
    lastUpdated: v.number(),
    createdAt: v.number(),
  })
    .index("by_vehicleNumber", ["vehicleNumber"])
    .index("by_status", ["status"])
    .index("by_riskLevel", ["riskLevel"])
    .index("by_cargoType", ["cargoType"])
    .index("by_operatorId", ["operatorId"])
    .index("by_status_and_riskLevel", ["status", "riskLevel"]),

  /* ============================================================ incidents */
  incidents: defineTable({
    incidentType: incidentType,
    description: v.string(),
    severity: severity,
    status: incidentStatus,
    latitude: v.number(),
    longitude: v.number(),
    locationName: v.string(),
    state: v.string(),
    district: v.string(),
    reportedBy: v.id("users"),
    /** Convex file storage id for the field officer's photograph. */
    imageStorageId: v.optional(v.id("_storage")),
    roadId: v.optional(v.id("roads")),
    verified: v.boolean(),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),
    /**
     * Idempotency key for offline-first field reporting. A queued report keeps
     * its client-generated uuid so a retried sync cannot create a duplicate.
     */
    clientUuid: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_district", ["district"])
    .index("by_state", ["state"])
    .index("by_severity", ["severity"])
    .index("by_roadId", ["roadId"])
    .index("by_reportedBy", ["reportedBy"])
    .index("by_clientUuid", ["clientUuid"])
    .index("by_status_and_severity", ["status", "severity"])
    .index("by_state_and_district", ["state", "district"]),

  /* ================================================================ roads */
  roads: defineTable({
    roadName: v.string(),
    roadNumber: v.string(),
    state: v.string(),
    district: v.string(),
    startLatitude: v.number(),
    startLongitude: v.number(),
    endLatitude: v.number(),
    endLongitude: v.number(),
    accessibilityStatus: accessibilityStatus,
    /** 0-100. Bands: <25 low, <50 moderate, <75 high, else critical. */
    riskScore: v.number(),
    riskLevel: riskLevel,
    /**
     * Full centreline geometry. Optional today (seed writes a 2-point line
     * from the start/end pair) so a real OSM-derived polyline can replace it
     * later with no schema change.
     */
    geometry: v.optional(lineString),
    roadClass: v.optional(roadClass),
    lengthKm: v.optional(v.number()),
    /**
     * Graph endpoints, as location names. Optional so existing rows stay
     * valid; the route engine skips any segment missing them rather than
     * guessing from coordinates.
     */
    startNode: v.optional(v.string()),
    endNode: v.optional(v.string()),
    lastUpdated: v.number(),
    createdAt: v.number(),
  })
    .index("by_roadNumber", ["roadNumber"])
    .index("by_startNode", ["startNode"])
    .index("by_endNode", ["endNode"])
    .index("by_district", ["district"])
    .index("by_state", ["state"])
    .index("by_accessibilityStatus", ["accessibilityStatus"])
    .index("by_riskLevel", ["riskLevel"])
    .index("by_state_and_district", ["state", "district"]),

  /* =============================================================== alerts */
  alerts: defineTable({
    title: v.string(),
    message: v.string(),
    alertType: alertType,
    severity: severity,
    status: alertStatus,
    /** Optional: district-wide alerts have no single point. */
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationName: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    relatedIncidentId: v.optional(v.id("incidents")),
    relatedVehicleId: v.optional(v.id("vehicles")),
    relatedRoadId: v.optional(v.id("roads")),
    recommendedAction: v.string(),
    /**
     * Stable identity for a recurring condition (e.g. "risk:NH-6:critical").
     * The risk engine refuses to raise a second active alert with the same
     * key, which is what stops a recalculation loop flooding the centre.
     */
    dedupeKey: v.optional(v.string()),
    acknowledgedBy: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_alertType", ["alertType"])
    .index("by_district", ["district"])
    .index("by_status_and_severity", ["status", "severity"])
    .index("by_dedupeKey", ["dedupeKey"]),

  /* =========================================================== deliveries */
  deliveries: defineTable({
    vehicleId: v.id("vehicles"),
    cargoType: cargoType,
    priority: deliveryPriority,
    origin: v.string(),
    destination: v.string(),
    status: deliveryStatus,
    estimatedArrival: v.number(),
    actualArrival: v.optional(v.number()),
    currentRouteId: v.optional(v.id("routes")),
    /** 0-100 completion, drives the dashboard progress rail. */
    progress: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_priority", ["priority"])
    .index("by_status_and_priority", ["status", "priority"]),

  /* =============================================================== routes */
  routes: defineTable({
    name: v.string(),
    origin: v.string(),
    destination: v.string(),
    /** km */
    distance: v.number(),
    /** minutes */
    estimatedTime: v.number(),
    riskScore: v.number(),
    routeType: routeType,
    status: routeStatus,
    /** GeoJSON LineString — ready for real routing-engine output. */
    geometry: v.optional(lineString),
    /** Road segments traversed; lets a blocked road invalidate a route. */
    roadIds: v.optional(v.array(v.id("roads"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_routeType", ["routeType"])
    .index("by_status_and_routeType", ["status", "routeType"]),

  /* ====================================================== riskPredictions */
  riskPredictions: defineTable({
    locationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    state: v.string(),
    district: v.string(),
    /** 0-100 */
    riskScore: v.number(),
    riskLevel: riskLevel,
    predictedIssue: v.string(),
    /** Stable machine classification;  stays human prose. */
    predictedIssueType: v.optional(predictedIssueType),
    /** 0-100 */
    confidence: v.number(),
    /**
     * Explainability payload. Weighted rather than a bare string list so the
     * UI can render a real contribution breakdown — this is what separates an
     * explainable risk engine from a fake "AI" label.
     */
    contributingFactors: v.array(
      v.object({
        factor: v.string(),
        weight: v.number(),
        /** Plain-language reason this factor contributed what it did. */
        explanation: v.optional(v.string()),
        /** Cap for this factor, so the UI can render weight as a share. */
        maxWeight: v.optional(v.number()),
      }),
    ),
    recommendedAction: v.string(),
    roadId: v.optional(v.id("roads")),
    /** Forecast horizon in hours (24 / 72). */
    horizonHours: v.optional(v.number()),
    modelVersion: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_district", ["district"])
    .index("by_state", ["state"])
    .index("by_riskLevel", ["riskLevel"])
    .index("by_createdAt", ["createdAt"])
    .index("by_roadId", ["roadId"]),

  /* ========================================================== weatherData */
  weatherData: defineTable({
    locationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    /** °C */
    temperature: v.number(),
    /** mm in the last 24h */
    rainfall: v.number(),
    /** % */
    humidity: v.number(),
    weatherCondition: weatherCondition,
    /** km/h */
    windSpeed: v.number(),
    alertLevel: weatherAlertLevel,
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    recordedAt: v.number(),
  })
    .index("by_locationName", ["locationName"])
    .index("by_recordedAt", ["recordedAt"])
    .index("by_alertLevel", ["alertLevel"])
    .index("by_district", ["district"]),

  /* ========================================================== activityLog */
  /**
   * Append-only operational feed powering the dashboard timeline.
   *
   * This is the one table beyond the nine specified, and it earns its place:
   * events like "alert acknowledged" or "vehicle entered high-risk zone" are
   * transitions, and cannot be reconstructed from the current state of any
   * other table once the transition has happened.
   */
  activityLog: defineTable({
    eventType: activityEventType,
    category: activityCategory,
    message: v.string(),
    severity: v.optional(severity),
    relatedVehicleId: v.optional(v.id("vehicles")),
    relatedIncidentId: v.optional(v.id("incidents")),
    relatedAlertId: v.optional(v.id("alerts")),
    relatedRoadId: v.optional(v.id("roads")),
    relatedDeliveryId: v.optional(v.id("deliveries")),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_category", ["category"])
    .index("by_eventType", ["eventType"]),

  /* ============================================================= seedMeta */
  /**
   * Single-row bookkeeping table that makes seeding idempotent: the seed
   * mutation checks for a matching version key and no-ops if already applied.
   */
  seedMeta: defineTable({
    key: v.string(),
    version: v.number(),
    seededAt: v.number(),
    counts: v.object({
      users: v.number(),
      roads: v.number(),
      routes: v.number(),
      vehicles: v.number(),
      incidents: v.number(),
      alerts: v.number(),
      deliveries: v.number(),
      riskPredictions: v.number(),
      weatherData: v.number(),
    }),
  }).index("by_key", ["key"]),
});

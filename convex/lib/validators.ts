import { v, type Infer } from "convex/values";

/**
 * Shared literal-union validators.
 *
 * Every enum in the NER-Vision AI data model lives here so that the schema,
 * the query/mutation argument validators and the frontend all derive from a
 * single source of truth. Nothing in this project uses `v.any()`.
 */

/* ------------------------------------------------------------------ users */

export const userRole = v.union(
  v.literal("admin"),
  v.literal("logistics_operator"),
  v.literal("field_officer"),
  v.literal("emergency_authority"),
);
export type UserRole = Infer<typeof userRole>;

/* --------------------------------------------------------------- vehicles */

export const vehicleType = v.union(
  v.literal("truck"),
  v.literal("tanker"),
  v.literal("reefer"),
  v.literal("pickup"),
  v.literal("ambulance"),
  v.literal("boat"),
);
export type VehicleType = Infer<typeof vehicleType>;

export const cargoType = v.union(
  v.literal("medicine"),
  v.literal("food"),
  v.literal("agricultural"),
  v.literal("construction"),
  v.literal("fuel"),
  v.literal("emergency"),
);
export type CargoType = Infer<typeof cargoType>;

export const vehicleStatus = v.union(
  v.literal("active"),
  v.literal("idle"),
  v.literal("delayed"),
  v.literal("emergency"),
  v.literal("offline"),
);
export type VehicleStatus = Infer<typeof vehicleStatus>;

/* -------------------------------------------------------- risk & severity */

/** Road / vehicle / prediction risk banding. Mirrors the 0-100 score bands. */
export const riskLevel = v.union(
  v.literal("low"),
  v.literal("moderate"),
  v.literal("high"),
  v.literal("critical"),
);
export type RiskLevel = Infer<typeof riskLevel>;

/** Incident and alert severity. */
export const severity = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);
export type Severity = Infer<typeof severity>;

/* -------------------------------------------------------------- incidents */

export const incidentType = v.union(
  v.literal("landslide"),
  v.literal("flood"),
  v.literal("road_damage"),
  v.literal("bridge_damage"),
  v.literal("accident"),
  v.literal("traffic"),
  v.literal("other"),
);
export type IncidentType = Infer<typeof incidentType>;

export const incidentStatus = v.union(
  v.literal("active"),
  v.literal("investigating"),
  v.literal("resolved"),
);
export type IncidentStatus = Infer<typeof incidentStatus>;

/* ------------------------------------------------------------------ roads */

export const accessibilityStatus = v.union(
  v.literal("accessible"),
  v.literal("restricted"),
  v.literal("blocked"),
);
export type AccessibilityStatus = Infer<typeof accessibilityStatus>;

export const roadClass = v.union(
  v.literal("NH"),
  v.literal("SH"),
  v.literal("MDR"),
  v.literal("rural"),
);
export type RoadClass = Infer<typeof roadClass>;

/* ----------------------------------------------------------------- alerts */

export const alertType = v.union(
  v.literal("road_blockage"),
  v.literal("severe_weather"),
  v.literal("landslide_risk"),
  v.literal("vehicle_delay"),
  v.literal("emergency"),
  v.literal("accessibility"),
);
export type AlertType = Infer<typeof alertType>;

export const alertStatus = v.union(
  v.literal("active"),
  v.literal("acknowledged"),
  v.literal("resolved"),
);
export type AlertStatus = Infer<typeof alertStatus>;

/* ------------------------------------------------------------- deliveries */

export const deliveryPriority = v.union(
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical"),
  v.literal("emergency"),
);
export type DeliveryPriority = Infer<typeof deliveryPriority>;

export const deliveryStatus = v.union(
  v.literal("pending"),
  v.literal("in_transit"),
  v.literal("delayed"),
  v.literal("delivered"),
  v.literal("cancelled"),
);
export type DeliveryStatus = Infer<typeof deliveryStatus>;

/* ----------------------------------------------------------------- routes */

export const routeType = v.union(
  v.literal("fastest"),
  v.literal("safest"),
  v.literal("emergency"),
);
export type RouteType = Infer<typeof routeType>;

export const routeStatus = v.union(
  v.literal("active"),
  v.literal("blocked"),
  v.literal("alternative"),
);
export type RouteStatus = Infer<typeof routeStatus>;

/**
 * GeoJSON-compatible LineString.
 *
 * Stored as `coordinates: [[lng, lat], ...]` so that road centrelines and
 * route polylines can be handed straight to Leaflet / MapLibre / turf.js, and
 * so a real GIS pipeline can be dropped in later without a schema migration.
 */
export const lineString = v.object({
  type: v.literal("LineString"),
  coordinates: v.array(v.array(v.number())),
});
export type LineString = Infer<typeof lineString>;

/* ---------------------------------------------------------------- weather */

export const weatherCondition = v.union(
  v.literal("clear"),
  v.literal("cloudy"),
  v.literal("rain"),
  v.literal("heavy_rain"),
  v.literal("thunderstorm"),
  v.literal("fog"),
  v.literal("snow"),
);
export type WeatherCondition = Infer<typeof weatherCondition>;

/** IMD-style colour-coded warning level. */
export const weatherAlertLevel = v.union(
  v.literal("none"),
  v.literal("yellow"),
  v.literal("orange"),
  v.literal("red"),
);
export type WeatherAlertLevel = Infer<typeof weatherAlertLevel>;

/* ----------------------------------------------------------- activity log */

export const activityCategory = v.union(
  v.literal("logistics"),
  v.literal("incident"),
  v.literal("risk"),
  v.literal("alert"),
  v.literal("system"),
);
export type ActivityCategory = Infer<typeof activityCategory>;

export const activityEventType = v.union(
  v.literal("vehicle_movement"),
  v.literal("vehicle_status_change"),
  v.literal("incident_reported"),
  v.literal("incident_verified"),
  v.literal("incident_resolved"),
  v.literal("road_status_change"),
  v.literal("road_risk_change"),
  v.literal("route_generated"),
  v.literal("alert_created"),
  v.literal("alert_acknowledged"),
  v.literal("alert_resolved"),
  v.literal("risk_prediction"),
  v.literal("delivery_update"),
  v.literal("system"),
);
export type ActivityEventType = Infer<typeof activityEventType>;

/* ------------------------------------------------------------ risk engine */

/**
 * Machine-readable classification of what the engine thinks will go wrong.
 * `predictedIssue` remains the human-readable sentence shown in the UI; this
 * is the stable key that code branches on.
 */
export const predictedIssueType = v.union(
  v.literal("landslide_risk"),
  v.literal("flood_risk"),
  v.literal("severe_weather_risk"),
  v.literal("road_accessibility_risk"),
);
export type PredictedIssueType = Infer<typeof predictedIssueType>;

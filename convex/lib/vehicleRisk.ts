import type { RiskLevel, Severity } from "./validators";
import { RISK_RANK } from "./helpers";

/**
 * Vehicle exposure assessment (pure functions).
 *
 * ## Method, and its honest limitation
 *
 * Exposure is computed from **straight-line great-circle distance** between a
 * vehicle's last known position and each hazard. It is NOT road-network
 * distance and NOT drive time.
 *
 * In the North East that distinction matters: a landslide 12 km away as the
 * crow flies can be 60 km by road across a ridge, or it can be directly ahead
 * on the same carriageway. This model deliberately over-triggers rather than
 * under-triggers — flagging a vehicle that turns out to be safe is cheap,
 * missing one that is driving into a closed corridor is not.
 *
 * Replacing this with true network distance requires the routing graph from
 * the Phase 1 architecture. The call signature is designed so that swap
 * touches only `distanceKm` — every threshold and reason below stays valid.
 */

/** A vehicle inside this radius of an incident is treated as exposed. */
export const INCIDENT_PROXIMITY_KM = 25;

/** Radius of a predicted risk zone for the purpose of vehicle exposure. */
export const RISK_ZONE_PROXIMITY_KM = 30;

export type ExposureCode =
  | "incident_proximity"
  | "risk_zone"
  | "blocked_route"
  | "road_risk"
  | "priority_cargo"
  | "delayed";

export interface ExposureReason {
  code: ExposureCode;
  /** Short label for a chip. */
  label: string;
  /** Sentence explaining what was measured. */
  detail: string;
  /** How much this reason alone raises the vehicle's band. */
  level: RiskLevel;
}

export interface HazardIncident {
  severity: Severity;
  incidentType: string;
  locationName: string;
  distanceKm: number;
}

export interface HazardPrediction {
  riskLevel: RiskLevel;
  predictedIssue: string;
  locationName: string;
  distanceKm: number;
}

export interface VehicleExposureInput {
  vehicleStatus: string;
  /** Accessibility of the corridor the vehicle is nearest to. */
  roadStatus?: "accessible" | "restricted" | "blocked";
  roadNumber?: string;
  roadRiskLevel?: RiskLevel;
  /** Status of the route assigned to the vehicle's active consignment. */
  routeStatus?: "active" | "blocked" | "alternative";
  routeName?: string;
  deliveryPriority?: "normal" | "high" | "critical" | "emergency";
  cargoType?: string;
  incidents: HazardIncident[];
  predictions: HazardPrediction[];
}

export interface VehicleExposure {
  riskLevel: RiskLevel;
  reasons: ExposureReason[];
  nearestIncidentKm: number | null;
  /** True when anything at all put this vehicle above `low`. */
  isAtRisk: boolean;
}

const SEVERITY_TO_LEVEL: Record<Severity, RiskLevel> = {
  critical: "critical",
  high: "high",
  medium: "moderate",
  low: "low",
};

/**
 * Assess one vehicle against the hazards around it.
 *
 * Reasons accumulate; the vehicle's band is the worst single reason rather
 * than a sum, because exposure is not additive — being near two landslides is
 * not twice as dangerous as being near one, it is still "do not proceed".
 */
export function assessVehicleExposure(
  input: VehicleExposureInput,
): VehicleExposure {
  const reasons: ExposureReason[] = [];

  /* ------------------------------------------------ confirmed incidents */
  const sortedIncidents = [...input.incidents].sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );
  const nearest = sortedIncidents.find(
    (i) => i.distanceKm <= INCIDENT_PROXIMITY_KM,
  );

  if (nearest) {
    reasons.push({
      code: "incident_proximity",
      label: "Near confirmed incident",
      detail: `Confirmed ${nearest.incidentType.replace(/_/g, " ")} (${nearest.severity}) at ${nearest.locationName}, ${Math.round(nearest.distanceKm)} km away in a straight line.`,
      level: SEVERITY_TO_LEVEL[nearest.severity],
    });
  }

  /* ------------------------------------------------- predicted risk zone */
  const zone = [...input.predictions]
    .filter(
      (p) =>
        p.distanceKm <= RISK_ZONE_PROXIMITY_KM &&
        (p.riskLevel === "high" || p.riskLevel === "critical"),
    )
    .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel])[0];

  if (zone) {
    reasons.push({
      code: "risk_zone",
      label: "Inside predicted risk zone",
      detail: `${zone.predictedIssue} forecast at ${zone.locationName} (${zone.riskLevel}), ${Math.round(zone.distanceKm)} km away.`,
      // A forecast raises concern one band below the forecast itself: it has
      // not happened yet.
      level: zone.riskLevel === "critical" ? "high" : "moderate",
    });
  }

  /* ------------------------------------------------------ blocked route */
  if (input.routeStatus === "blocked") {
    reasons.push({
      code: "blocked_route",
      label: "Assigned route blocked",
      detail: `The consignment's route${input.routeName ? ` "${input.routeName}"` : ""} crosses a corridor that is closed to traffic.`,
      level: "critical",
    });
  }

  /* -------------------------------------------------------- road status */
  if (input.roadStatus === "blocked") {
    reasons.push({
      code: "road_risk",
      label: "Corridor blocked",
      detail: `${input.roadNumber ?? "The nearest corridor"} is blocked to all traffic.`,
      level: "critical",
    });
  } else if (
    input.roadStatus === "restricted" ||
    input.roadRiskLevel === "high" ||
    input.roadRiskLevel === "critical"
  ) {
    reasons.push({
      code: "road_risk",
      label: "Corridor restricted",
      detail: `${input.roadNumber ?? "The nearest corridor"} is under movement restrictions (${input.roadRiskLevel ?? "elevated"} risk).`,
      level: "high",
    });
  }

  /* ------------------------------------------------------------ delayed */
  if (input.vehicleStatus === "delayed") {
    reasons.push({
      code: "delayed",
      label: "Delayed",
      detail: "Vehicle is not making progress against its schedule.",
      level: "moderate",
    });
  }

  /* ----------------------------------------------------- priority cargo */
  const isPriority =
    input.deliveryPriority === "emergency" ||
    input.deliveryPriority === "critical";

  if (isPriority && reasons.length > 0) {
    reasons.push({
      code: "priority_cargo",
      label: "Priority consignment",
      detail: `Carrying ${input.cargoType ?? "priority"} cargo at ${input.deliveryPriority} priority — disruption here has outsized consequence.`,
      // Priority does not create risk; it escalates whatever risk exists.
      level: "high",
    });
  }

  const riskLevel = reasons.reduce<RiskLevel>(
    (worst, r) => (RISK_RANK[r.level] > RISK_RANK[worst] ? r.level : worst),
    "low",
  );

  return {
    riskLevel,
    reasons,
    nearestIncidentKm: sortedIncidents[0]?.distanceKm ?? null,
    isAtRisk: reasons.length > 0 && riskLevel !== "low",
  };
}

/**
 * Should this delivery be considered delayed?
 *
 * MVP rule, deliberately simple and stated plainly: a consignment is late if
 * its estimated arrival has passed while it is still in transit, or if its
 * vehicle is halted or exposed to critical risk with arrival imminent.
 */
export function isDeliveryDelayed(input: {
  status: string;
  estimatedArrival: number;
  now: number;
  vehicleStatus: string;
  vehicleRiskLevel: RiskLevel;
}): { delayed: boolean; reason: string } {
  if (input.status !== "in_transit" && input.status !== "pending") {
    return { delayed: false, reason: "" };
  }

  if (input.now > input.estimatedArrival) {
    const lateMinutes = Math.round((input.now - input.estimatedArrival) / 60000);
    return {
      delayed: true,
      reason: `Estimated arrival passed ${lateMinutes} minute${lateMinutes === 1 ? "" : "s"} ago and the consignment is still in transit.`,
    };
  }

  if (
    input.vehicleStatus === "delayed" ||
    input.vehicleRiskLevel === "critical"
  ) {
    return {
      delayed: true,
      reason:
        input.vehicleStatus === "delayed"
          ? "Assigned vehicle is halted."
          : "Assigned vehicle is in a critical-risk corridor.",
    };
  }

  return { delayed: false, reason: "" };
}

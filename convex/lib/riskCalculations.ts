import type {
  AccessibilityStatus,
  PredictedIssueType,
  RiskLevel,
  Severity,
  WeatherAlertLevel,
  WeatherCondition,
} from "./validators";
import { clamp } from "./helpers";

/**
 * NER-Vision AI — explainable risk engine (pure functions).
 *
 * ## What this is, honestly
 *
 * This is a **transparent weighted rule engine**, not a trained machine
 * learning model. Nothing here is a neural network and nothing is random.
 * Every point a location scores is attributable to a named factor with a
 * stated reason, and the same inputs always produce the same output.
 *
 * ## Why a rule engine for the MVP
 *
 * A supervised model needs a labelled history of road closures for the NER,
 * which is not publicly available. Fabricating one and calling the result
 * "AI" would be dishonest. A weighted rule engine grounded in real rainfall,
 * real terrain and real reported incidents is defensible, auditable, and
 * behaves correctly on the day of the demo.
 *
 * ## The scoring model
 *
 * Six factors contribute to a 0-100 score. Their caps sum to exactly 100, so
 * a factor's cap *is* its maximum share of the score:
 *
 * | Factor              | Cap | Source                                    |
 * |---------------------|-----|-------------------------------------------|
 * | Rainfall            |  30 | weatherData.rainfall (mm/24h)             |
 * | Nearby incidents    |  20 | active incidents within 30 km             |
 * | Terrain             |  15 | static terrain index (elevation/slope)    |
 * | Road condition      |  15 | current accessibilityStatus               |
 * | Weather severity    |  12 | condition, IMD alert level, wind, humidity|
 * | Historical pattern  |   8 | count of past incidents at the location   |
 *
 * Rainfall dominates deliberately: rainfall-triggered slope failure is the
 * primary disruption mechanism in this region during monsoon.
 *
 * ## Future ML integration
 *
 * `calculateOverallRisk` is a pure function from a feature object to a scored
 * result. A Python service would replace exactly this one call: it receives
 * `RiskFactorInputs` (already a flat feature vector), and returns the same
 * `RiskAssessment` shape — score, level, issue type, confidence, and weighted
 * contributions. Nothing else in the application would change, because every
 * caller depends on the return shape rather than on how it was produced.
 */

/* ------------------------------------------------------------------ types */

export interface FactorContribution {
  /** Stable identifier, safe to branch on. */
  key:
    | "rainfall"
    | "incidents"
    | "terrain"
    | "roadCondition"
    | "weather"
    | "historical";
  /** Human-readable label shown in the explainability panel. */
  factor: string;
  /** Points contributed to the final score. */
  weight: number;
  /** Maximum this factor can ever contribute. */
  maxWeight: number;
  /** Why it contributed what it did. */
  explanation: string;
}

export interface NearbyIncident {
  severity: Severity;
  distanceKm: number;
  incidentType: string;
}

export interface RiskFactorInputs {
  locationName: string;
  /** mm in the last 24h. Undefined when no observation is available. */
  rainfallMm?: number;
  weatherCondition?: WeatherCondition;
  weatherAlertLevel?: WeatherAlertLevel;
  windSpeedKmph?: number;
  humidityPct?: number;
  /** Age of the weather observation in hours; drives the confidence score. */
  weatherAgeHours?: number;
  nearbyIncidents: NearbyIncident[];
  /** 0-1 static terrain susceptibility. */
  terrainIndex?: number;
  /** 0-1 static flood exposure. */
  floodIndex?: number;
  accessibilityStatus?: AccessibilityStatus;
  /** Count of incidents ever recorded at or near this location. */
  historicalIncidentCount: number;
  /** Prior score for this location, used only for temporal smoothing. */
  previousScore?: number;
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  predictedIssueType: PredictedIssueType;
  predictedIssue: string;
  confidence: number;
  contributingFactors: FactorContribution[];
  recommendedAction: string;
  /** Score before temporal smoothing — useful for auditing. */
  rawScore: number;
}

/* ----------------------------------------------------------- factor caps */

export const FACTOR_CAPS = {
  rainfall: 30,
  incidents: 20,
  terrain: 15,
  roadCondition: 15,
  weather: 12,
  historical: 8,
} as const;

/** Radius beyond which a confirmed incident no longer influences a location. */
const INCIDENT_RADIUS_KM = 30;

/** Weight given to the previous score when smoothing. See `calculateOverallRisk`. */
const SMOOTHING_PREVIOUS = 0.15;

/* --------------------------------------------------------------- rainfall */

/**
 * Rainfall contribution, 0-30.
 *
 * Piecewise-linear against 24-hour accumulation. The band boundaries follow
 * IMD's rainfall classification (heavy 64.5 mm, very heavy 115.5 mm,
 * extremely heavy 204.5 mm), compressed into the 0-30 budget.
 */
export function calculateRainfallRisk(rainfallMm?: number): FactorContribution {
  const cap = FACTOR_CAPS.rainfall;
  const base = {
    key: "rainfall" as const,
    factor: "Rainfall intensity",
    maxWeight: cap,
  };

  if (rainfallMm === undefined) {
    return {
      ...base,
      weight: 0,
      explanation: "No rainfall observation available for this location.",
    };
  }

  const mm = Math.max(0, rainfallMm);
  let points: number;
  let explanation: string;

  if (mm < 10) {
    points = 0;
    explanation = `${Math.round(mm)} mm in 24h — negligible, below the 10 mm threshold.`;
  } else if (mm < 25) {
    points = ((mm - 10) / 15) * 5;
    explanation = `${Math.round(mm)} mm in 24h — light rainfall, minor saturation.`;
  } else if (mm < 50) {
    points = 5 + ((mm - 25) / 25) * 7;
    explanation = `${Math.round(mm)} mm in 24h — moderate rainfall, soil saturation building.`;
  } else if (mm < 100) {
    points = 12 + ((mm - 50) / 50) * 10;
    explanation = `${Math.round(mm)} mm in 24h — heavy rainfall, slope saturation likely.`;
  } else if (mm < 150) {
    points = 22 + ((mm - 100) / 50) * 6;
    explanation = `${Math.round(mm)} mm in 24h — very heavy rainfall, above the IMD heavy-rain threshold.`;
  } else {
    points = 28 + Math.min((mm - 150) / 100, 1) * 2;
    explanation = `${Math.round(mm)} mm in 24h — extremely heavy rainfall, well past the high-risk threshold.`;
  }

  return { ...base, weight: round1(clamp(points, 0, cap)), explanation };
}

/* ---------------------------------------------------------------- weather */

const CONDITION_POINTS: Record<WeatherCondition, number> = {
  clear: 0,
  cloudy: 1,
  fog: 3,
  rain: 4,
  snow: 5,
  thunderstorm: 6,
  heavy_rain: 7,
};

const ALERT_POINTS: Record<WeatherAlertLevel, number> = {
  none: 0,
  yellow: 1,
  orange: 3,
  red: 5,
};

/**
 * Weather severity contribution, 0-12.
 *
 * Separate from rainfall so that a red IMD warning still registers even when
 * the accumulation figure has not yet caught up with the forecast.
 */
export function calculateWeatherRisk(
  condition?: WeatherCondition,
  alertLevel?: WeatherAlertLevel,
  windSpeedKmph?: number,
  humidityPct?: number,
): FactorContribution {
  const cap = FACTOR_CAPS.weather;
  const base = {
    key: "weather" as const,
    factor: "Weather severity",
    maxWeight: cap,
  };

  if (!condition && !alertLevel) {
    return {
      ...base,
      weight: 0,
      explanation: "No weather observation available for this location.",
    };
  }

  const conditionPoints = condition ? CONDITION_POINTS[condition] : 0;
  const alertPoints = alertLevel ? ALERT_POINTS[alertLevel] : 0;
  const windPoints = (windSpeedKmph ?? 0) > 40 ? 1 : 0;
  const humidityPoints = (humidityPct ?? 0) > 90 ? 1 : 0;

  const total = conditionPoints + alertPoints + windPoints + humidityPoints;

  const parts: string[] = [];
  if (condition) parts.push(condition.replace(/_/g, " "));
  if (alertLevel && alertLevel !== "none") parts.push(`${alertLevel} warning`);
  if (windPoints) parts.push(`wind ${Math.round(windSpeedKmph!)} km/h`);
  if (humidityPoints) parts.push(`humidity ${Math.round(humidityPct!)}%`);

  return {
    ...base,
    weight: round1(clamp(total, 0, cap)),
    explanation:
      parts.length > 0
        ? `Current conditions: ${parts.join(", ")}.`
        : "Settled conditions, no active weather warning.",
  };
}

/* -------------------------------------------------------------- incidents */

const INCIDENT_SEVERITY_POINTS: Record<Severity, number> = {
  critical: 20,
  high: 13,
  medium: 7,
  low: 3,
};

/**
 * Confirmed-incident contribution, 0-20.
 *
 * Influence decays linearly to zero at 30 km. The nearest/most severe
 * incident dominates; additional incidents add a quarter of their value, so
 * a cluster scores higher than a single event without the total running away.
 */
export function calculateIncidentRisk(
  nearbyIncidents: NearbyIncident[],
): FactorContribution {
  const cap = FACTOR_CAPS.incidents;
  const base = {
    key: "incidents" as const,
    factor: "Nearby confirmed incidents",
    maxWeight: cap,
  };

  if (nearbyIncidents.length === 0) {
    return {
      ...base,
      weight: 0,
      explanation: `No confirmed incidents within ${INCIDENT_RADIUS_KM} km.`,
    };
  }

  const scored = nearbyIncidents
    .map((incident) => {
      const decay = Math.max(0, 1 - incident.distanceKm / INCIDENT_RADIUS_KM);
      return {
        incident,
        value: INCIDENT_SEVERITY_POINTS[incident.severity] * decay,
      };
    })
    .sort((a, b) => b.value - a.value);

  const primary = scored[0];
  const secondary = scored.slice(1).reduce((sum, s) => sum + s.value * 0.25, 0);
  const total = primary.value + secondary;

  const others =
    scored.length > 1 ? ` plus ${scored.length - 1} other nearby.` : ".";

  return {
    ...base,
    weight: round1(clamp(total, 0, cap)),
    explanation: `Confirmed ${primary.incident.incidentType.replace(/_/g, " ")} (${primary.incident.severity}) ${Math.round(primary.incident.distanceKm)} km away${others}`,
  };
}

/* ---------------------------------------------------------------- terrain */

/**
 * Terrain contribution, 0-15.
 *
 * Driven by the static terrain-susceptibility index. This is a documented
 * baseline standing in for DEM-derived slope until elevation data is ingested.
 */
export function calculateTerrainRisk(
  terrainIndex?: number,
): FactorContribution {
  const cap = FACTOR_CAPS.terrain;
  const base = {
    key: "terrain" as const,
    factor: "Terrain susceptibility",
    maxWeight: cap,
  };

  if (terrainIndex === undefined) {
    return {
      ...base,
      weight: 0,
      explanation: "No terrain profile on record for this location.",
    };
  }

  const index = clamp(terrainIndex, 0, 1);
  const descriptor =
    index >= 0.8
      ? "steep high-altitude slopes"
      : index >= 0.55
        ? "hill terrain with cut slopes"
        : index >= 0.3
          ? "moderate valley terrain"
          : "low-relief plains";

  return {
    ...base,
    weight: round1(index * cap),
    explanation: `Location sits in ${descriptor} (terrain index ${index.toFixed(2)}).`,
  };
}

/* --------------------------------------------------------- road condition */

const ACCESS_POINTS: Record<AccessibilityStatus, number> = {
  accessible: 0,
  restricted: 9,
  blocked: 15,
};

/**
 * Road condition contribution, 0-15.
 *
 * Uses the road's *current accessibility* — an observed fact — rather than
 * its previous risk score. Feeding a score back into itself as an input
 * creates a ratchet that only ever climbs; keeping this factor grounded in
 * observed status avoids that. The previous score is still used, but only as
 * a damped smoothing term in `calculateOverallRisk`, which converges rather
 * than compounds.
 */
export function calculateRoadConditionRisk(
  accessibilityStatus?: AccessibilityStatus,
): FactorContribution {
  const cap = FACTOR_CAPS.roadCondition;
  const base = {
    key: "roadCondition" as const,
    factor: "Road condition",
    maxWeight: cap,
  };

  if (!accessibilityStatus) {
    return {
      ...base,
      weight: 0,
      explanation: "No monitored road segment associated with this location.",
    };
  }

  const explanation =
    accessibilityStatus === "blocked"
      ? "Associated corridor is already blocked to traffic."
      : accessibilityStatus === "restricted"
        ? "Associated corridor is under movement restrictions."
        : "Associated corridor is currently open to traffic.";

  return {
    ...base,
    weight: ACCESS_POINTS[accessibilityStatus],
    explanation,
  };
}

/* ------------------------------------------------------------- historical */

/**
 * Historical pattern contribution, 0-8.
 *
 * Counts incidents ever recorded at this location, including resolved ones —
 * a corridor that has failed repeatedly is more likely to fail again.
 */
export function calculateHistoricalRisk(
  historicalIncidentCount: number,
): FactorContribution {
  const cap = FACTOR_CAPS.historical;
  const base = {
    key: "historical" as const,
    factor: "Historical disruption pattern",
    maxWeight: cap,
  };

  const count = Math.max(0, Math.floor(historicalIncidentCount));
  // Diminishing returns: the first repeat is the most informative.
  const points = count === 0 ? 0 : Math.min(cap, 3 + Math.log2(count) * 2.5);

  return {
    ...base,
    weight: round1(points),
    explanation:
      count === 0
        ? "No prior incidents recorded at this location."
        : `${count} prior incident${count === 1 ? "" : "s"} recorded at this location.`,
  };
}

/* ------------------------------------------------------------ risk levels */

/**
 * Band a 0-100 score.
 * 0-25 low · 26-50 moderate · 51-75 high · 76-100 critical.
 */
export function determineRiskLevel(score: number): RiskLevel {
  const s = clamp(score, 0, 100);
  if (s <= 25) return "low";
  if (s <= 50) return "moderate";
  if (s <= 75) return "high";
  return "critical";
}

/* ------------------------------------------------------- issue classifier */

/**
 * Decide which failure mode the score is describing.
 *
 * Transparent rule-based classification: each candidate issue accumulates the
 * factor contributions that actually drive it, and the strongest signal wins.
 * There is no model here and no probability claim.
 */
export function determinePredictedIssue(
  contributions: FactorContribution[],
  inputs: RiskFactorInputs,
): { type: PredictedIssueType; label: string } {
  const by = (key: FactorContribution["key"]) =>
    contributions.find((c) => c.key === key)?.weight ?? 0;

  const rainfall = by("rainfall");
  const terrain = by("terrain");
  const weather = by("weather");
  const road = by("roadCondition");
  const historical = by("historical");
  const incidents = by("incidents");

  const terrainIndex = inputs.terrainIndex ?? 0;
  const floodIndex = inputs.floodIndex ?? 0;

  const nearbyLandslide = inputs.nearbyIncidents.some(
    (i) => i.incidentType === "landslide",
  );
  const nearbyFlood = inputs.nearbyIncidents.some(
    (i) => i.incidentType === "flood",
  );

  // Rain on steep ground is the landslide signature; rain on flat, flood-prone
  // ground is the flooding signature. The indices separate the two cleanly.
  const landslideSignal =
    rainfall * terrainIndex + terrain + (nearbyLandslide ? incidents : 0);
  const floodSignal =
    rainfall * floodIndex + (nearbyFlood ? incidents : 0) + weather * 0.3;
  const weatherSignal = weather * 1.6;
  const accessSignal = road + historical + incidents * 0.5;

  const candidates: Array<{
    type: PredictedIssueType;
    label: string;
    signal: number;
  }> = [
    {
      type: "landslide_risk",
      label: "Landslide / slope failure risk",
      signal: landslideSignal,
    },
    { type: "flood_risk", label: "Flooding risk", signal: floodSignal },
    {
      type: "severe_weather_risk",
      label: "Severe weather disruption",
      signal: weatherSignal,
    },
    {
      type: "road_accessibility_risk",
      label: "Road accessibility degradation",
      signal: accessSignal,
    },
  ];

  candidates.sort((a, b) => b.signal - a.signal);
  return { type: candidates[0].type, label: candidates[0].label };
}

/* ------------------------------------------------------------- confidence */

/**
 * Confidence that the score reflects reality, 35-95.
 *
 * Deliberately never reaches 100: a rule engine over partial data should not
 * claim certainty. Three components, documented so the number is auditable:
 *
 * - **Coverage (0-30)** — how many of the five external inputs were actually
 *   available (weather, terrain, road, incident data, history).
 * - **Freshness (0-18)** — how recent the weather observation is. Stale data
 *   lowers confidence without lowering the score itself.
 * - **Agreement (0-17)** — how concentrated the contributions are. One factor
 *   carrying most of the score is a clear signal; six factors each adding a
 *   little is an ambiguous one.
 *
 * Base of 35 reflects that the model structure itself carries information
 * even when inputs are thin.
 */
export function calculateConfidence(
  contributions: FactorContribution[],
  inputs: RiskFactorInputs,
): { confidence: number; reason: string } {
  const available = [
    inputs.rainfallMm !== undefined || inputs.weatherCondition !== undefined,
    inputs.terrainIndex !== undefined,
    inputs.accessibilityStatus !== undefined,
    inputs.nearbyIncidents.length > 0,
    inputs.historicalIncidentCount > 0,
  ];
  const coverage = available.filter(Boolean).length / available.length;

  const ageHours = inputs.weatherAgeHours;
  const freshness =
    ageHours === undefined
      ? 0.15
      : ageHours < 3
        ? 1
        : ageHours < 12
          ? 0.7
          : ageHours < 24
            ? 0.4
            : 0.15;

  const total = contributions.reduce((sum, c) => sum + c.weight, 0);
  const top = Math.max(0, ...contributions.map((c) => c.weight));
  const agreement = total > 0 ? clamp(top / total, 0, 1) : 0;

  const confidence = clamp(
    35 + coverage * 30 + freshness * 18 + agreement * 17,
    35,
    95,
  );

  const missing = available.filter((a) => !a).length;
  const reason =
    missing === 0 && freshness >= 1
      ? "All five input sources present and current."
      : `${available.length - missing} of ${available.length} input sources available; ${
          ageHours === undefined
            ? "no weather timestamp"
            : `weather observation ${Math.round(ageHours)}h old`
        }.`;

  return { confidence: Math.round(confidence), reason };
}

/* -------------------------------------------------- recommended action */

/** Transparent action rules, keyed on band and failure mode. */
export function generateRecommendedAction(
  level: RiskLevel,
  issueType: PredictedIssueType,
  context: { roadNumber?: string; locationName: string },
): string {
  const corridor = context.roadNumber
    ? `${context.roadNumber} at ${context.locationName}`
    : context.locationName;

  if (level === "critical") {
    switch (issueType) {
      case "landslide_risk":
        return `Suspend movement through ${corridor} and divert essential consignments to the safest alternative. Position clearing equipment at the nearest depot.`;
      case "flood_risk":
        return `Halt low-clearance traffic through ${corridor}. Pre-position relief and medical stock ahead of possible isolation.`;
      case "severe_weather_risk":
        return `Suspend non-emergency movement around ${corridor} until the warning is downgraded.`;
      case "road_accessibility_risk":
        return `Treat ${corridor} as closed for planning. Re-route all active consignments now.`;
    }
  }

  if (level === "high") {
    switch (issueType) {
      case "landslide_risk":
        return `Restrict heavy vehicles on ${corridor} and prepare an alternative route. Increase inspection frequency on cut slopes.`;
      case "flood_risk":
        return `Advise operators of possible waterlogging on ${corridor}; hold low-clearance vehicles.`;
      case "severe_weather_risk":
        return `Avoid non-essential movement through ${corridor} and add transit-time allowance.`;
      case "road_accessibility_risk":
        return `Evaluate alternatives for ${corridor} before dispatching further consignments.`;
    }
  }

  if (level === "moderate") {
    return `Monitor conditions at ${corridor} and identify an alternative route in advance. No restriction required yet.`;
  }

  return `Continue routine monitoring of ${corridor}. No action required.`;
}

/* ---------------------------------------------------------------- overall */

/**
 * Run the full assessment.
 *
 * Raw score is the sum of the six capped factors. It is then blended with the
 * previous score (85% new / 15% previous) so a single noisy observation
 * cannot make a corridor flip bands and back again between recalculations.
 * Because it is a weighted average rather than an accumulation, the score
 * converges on the true value instead of ratcheting upward.
 */
export function calculateOverallRisk(
  inputs: RiskFactorInputs,
): RiskAssessment {
  const contributions: FactorContribution[] = [
    calculateRainfallRisk(inputs.rainfallMm),
    calculateIncidentRisk(inputs.nearbyIncidents),
    calculateTerrainRisk(inputs.terrainIndex),
    calculateRoadConditionRisk(inputs.accessibilityStatus),
    calculateWeatherRisk(
      inputs.weatherCondition,
      inputs.weatherAlertLevel,
      inputs.windSpeedKmph,
      inputs.humidityPct,
    ),
    calculateHistoricalRisk(inputs.historicalIncidentCount),
  ];

  const rawScore = clamp(
    contributions.reduce((sum, c) => sum + c.weight, 0),
    0,
    100,
  );

  const smoothed =
    inputs.previousScore === undefined
      ? rawScore
      : rawScore * (1 - SMOOTHING_PREVIOUS) +
        inputs.previousScore * SMOOTHING_PREVIOUS;

  const riskScore = Math.round(clamp(smoothed, 0, 100));
  const riskLevel = determineRiskLevel(riskScore);
  const issue = determinePredictedIssue(contributions, inputs);
  const { confidence } = calculateConfidence(contributions, inputs);

  return {
    riskScore,
    rawScore: Math.round(rawScore),
    riskLevel,
    predictedIssueType: issue.type,
    predictedIssue: issue.label,
    confidence,
    // Largest contributor first — that is the order the UI explains them in.
    contributingFactors: contributions
      .filter((c) => c.weight > 0)
      .sort((a, b) => b.weight - a.weight),
    recommendedAction: generateRecommendedAction(riskLevel, issue.type, {
      locationName: inputs.locationName,
    }),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Presentation rules for the risk ramp.
 *
 * Green → safe, yellow → moderate, orange → high, red → critical. The mapping
 * lives here alone so the map, the cards, the alert panel and the legend can
 * never drift apart.
 */

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type Severity = "low" | "medium" | "high" | "critical";
export type AccessibilityStatus = "accessible" | "restricted" | "blocked";

interface Tone {
  /** Tailwind text colour class. */
  text: string;
  /** Tailwind background tint for chips. */
  chip: string;
  /** Border colour for chips and rails. */
  border: string;
  /** Solid colour for dots, rails and map strokes. */
  hex: string;
  label: string;
}

const SAFE = "oklch(0.735 0.155 158)";
const MODERATE = "oklch(0.815 0.145 88)";
const HIGH = "oklch(0.727 0.163 55)";
const CRITICAL = "oklch(0.648 0.201 22)";

export const RISK_TONE: Record<RiskLevel, Tone> = {
  low: {
    text: "text-[oklch(0.735_0.155_158)]",
    chip: "bg-[oklch(0.735_0.155_158)]/12",
    border: "border-[oklch(0.735_0.155_158)]/35",
    hex: SAFE,
    label: "Low",
  },
  moderate: {
    text: "text-[oklch(0.815_0.145_88)]",
    chip: "bg-[oklch(0.815_0.145_88)]/12",
    border: "border-[oklch(0.815_0.145_88)]/35",
    hex: MODERATE,
    label: "Moderate",
  },
  high: {
    text: "text-[oklch(0.727_0.163_55)]",
    chip: "bg-[oklch(0.727_0.163_55)]/12",
    border: "border-[oklch(0.727_0.163_55)]/35",
    hex: HIGH,
    label: "High",
  },
  critical: {
    text: "text-[oklch(0.648_0.201_22)]",
    chip: "bg-[oklch(0.648_0.201_22)]/14",
    border: "border-[oklch(0.648_0.201_22)]/40",
    hex: CRITICAL,
    label: "Critical",
  },
};

export const SEVERITY_TONE: Record<Severity, Tone> = {
  low: { ...RISK_TONE.low, label: "Low" },
  medium: { ...RISK_TONE.moderate, label: "Medium" },
  high: { ...RISK_TONE.high, label: "High" },
  critical: { ...RISK_TONE.critical, label: "Critical" },
};

export const ACCESS_TONE: Record<AccessibilityStatus, Tone> = {
  accessible: { ...RISK_TONE.low, label: "Accessible" },
  restricted: { ...RISK_TONE.high, label: "Restricted" },
  blocked: { ...RISK_TONE.critical, label: "Blocked" },
};

/** Vehicle status colouring — offline/idle stay neutral rather than green. */
export const VEHICLE_STATUS_TONE: Record<
  string,
  { text: string; chip: string; border: string; hex: string; label: string }
> = {
  active: { ...RISK_TONE.low, label: "Active" },
  idle: {
    text: "text-muted-foreground",
    chip: "bg-muted",
    border: "border-border",
    hex: "oklch(0.685 0.019 245)",
    label: "Idle",
  },
  delayed: { ...RISK_TONE.moderate, label: "Delayed" },
  emergency: { ...RISK_TONE.critical, label: "Emergency" },
  offline: {
    text: "text-muted-foreground/70",
    chip: "bg-muted/60",
    border: "border-border",
    hex: "oklch(0.5 0.015 245)",
    label: "Offline",
  },
};

export function riskLevelFromScore(score: number): RiskLevel {
  const s = Math.min(Math.max(score, 0), 100);
  // Must mirror convex/lib/helpers.ts exactly: 0-25 / 26-50 / 51-75 / 76-100.
  if (s <= 25) return "low";
  if (s <= 50) return "moderate";
  if (s <= 75) return "high";
  return "critical";
}

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Human labels for the enum values stored in Convex. */
export const INCIDENT_LABEL: Record<string, string> = {
  landslide: "Landslide",
  flood: "Flood",
  road_damage: "Road damage",
  bridge_damage: "Bridge damage",
  accident: "Accident",
  traffic: "Traffic",
  other: "Other",
};

export const CARGO_LABEL: Record<string, string> = {
  medicine: "Medicine",
  food: "Food supplies",
  agricultural: "Agricultural",
  construction: "Construction",
  fuel: "Fuel",
  emergency: "Emergency supplies",
};

export const ALERT_TYPE_LABEL: Record<string, string> = {
  road_blockage: "Road blockage",
  severe_weather: "Severe weather",
  landslide_risk: "Landslide risk",
  vehicle_delay: "Vehicle delay",
  emergency: "Emergency",
  accessibility: "Accessibility",
};

export const VEHICLE_TYPE_LABEL: Record<string, string> = {
  truck: "Truck",
  tanker: "Tanker",
  reefer: "Refrigerated",
  pickup: "Pickup",
  ambulance: "Ambulance",
  boat: "River boat",
};

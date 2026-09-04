/**
 * Static reference data for the North Eastern Region.
 *
 * Coordinates are real district-headquarter locations and the highway numbers
 * are the real NH designations serving those corridors. Nothing here is a
 * random number — the seed builds on top of genuine geography so the demo map
 * reads correctly to anyone who knows the region.
 */

export const NER_STATES = [
  "Assam",
  "Arunachal Pradesh",
  "Meghalaya",
  "Manipur",
  "Mizoram",
  "Nagaland",
  "Tripura",
  "Sikkim",
] as const;

export type NerState = (typeof NER_STATES)[number];

export interface NerLocation {
  name: string;
  state: NerState;
  district: string;
  lat: number;
  lng: number;
}

/** District headquarters and key logistics nodes across all eight states. */
export const NER_LOCATIONS: NerLocation[] = [
  // ---------------------------------------------------------------- Assam
  { name: "Guwahati", state: "Assam", district: "Kamrup Metropolitan", lat: 26.1445, lng: 91.7362 },
  { name: "Jorhat", state: "Assam", district: "Jorhat", lat: 26.7509, lng: 94.2037 },
  { name: "Dibrugarh", state: "Assam", district: "Dibrugarh", lat: 27.4728, lng: 94.912 },
  { name: "Silchar", state: "Assam", district: "Cachar", lat: 24.8333, lng: 92.7789 },
  { name: "Tezpur", state: "Assam", district: "Sonitpur", lat: 26.6528, lng: 92.7926 },
  { name: "Nagaon", state: "Assam", district: "Nagaon", lat: 26.3464, lng: 92.684 },

  // ---------------------------------------------------- Arunachal Pradesh
  { name: "Itanagar", state: "Arunachal Pradesh", district: "Papum Pare", lat: 27.0844, lng: 93.6053 },
  { name: "Seppa", state: "Arunachal Pradesh", district: "East Kameng", lat: 27.2833, lng: 92.9167 },
  { name: "Bomdila", state: "Arunachal Pradesh", district: "West Kameng", lat: 27.2649, lng: 92.4159 },
  { name: "Tawang", state: "Arunachal Pradesh", district: "Tawang", lat: 27.5859, lng: 91.8594 },
  { name: "Pasighat", state: "Arunachal Pradesh", district: "East Siang", lat: 28.0667, lng: 95.3333 },
  { name: "Ziro", state: "Arunachal Pradesh", district: "Lower Subansiri", lat: 27.5449, lng: 93.8258 },

  // ------------------------------------------------------------ Meghalaya
  { name: "Shillong", state: "Meghalaya", district: "East Khasi Hills", lat: 25.5788, lng: 91.8933 },
  { name: "Tura", state: "Meghalaya", district: "West Garo Hills", lat: 25.5142, lng: 90.2026 },
  { name: "Jowai", state: "Meghalaya", district: "West Jaintia Hills", lat: 25.45, lng: 92.2 },
  { name: "Nongpoh", state: "Meghalaya", district: "Ri-Bhoi", lat: 25.9, lng: 91.88 },

  // -------------------------------------------------------------- Manipur
  { name: "Imphal", state: "Manipur", district: "Imphal West", lat: 24.817, lng: 93.9368 },
  { name: "Churachandpur", state: "Manipur", district: "Churachandpur", lat: 24.3333, lng: 93.6833 },
  { name: "Ukhrul", state: "Manipur", district: "Ukhrul", lat: 25.1, lng: 94.3667 },

  // -------------------------------------------------------------- Mizoram
  { name: "Aizawl", state: "Mizoram", district: "Aizawl", lat: 23.7271, lng: 92.7176 },
  { name: "Lunglei", state: "Mizoram", district: "Lunglei", lat: 22.8879, lng: 92.7337 },
  { name: "Champhai", state: "Mizoram", district: "Champhai", lat: 23.456, lng: 93.329 },

  // ------------------------------------------------------------- Nagaland
  { name: "Kohima", state: "Nagaland", district: "Kohima", lat: 25.6751, lng: 94.1086 },
  { name: "Dimapur", state: "Nagaland", district: "Dimapur", lat: 25.9044, lng: 93.7267 },
  { name: "Mokokchung", state: "Nagaland", district: "Mokokchung", lat: 26.322, lng: 94.515 },

  // -------------------------------------------------------------- Tripura
  { name: "Agartala", state: "Tripura", district: "West Tripura", lat: 23.8315, lng: 91.2868 },
  { name: "Udaipur", state: "Tripura", district: "Gomati", lat: 23.5333, lng: 91.4833 },
  { name: "Dharmanagar", state: "Tripura", district: "North Tripura", lat: 24.3667, lng: 92.1667 },

  // --------------------------------------------------------------- Sikkim
  { name: "Gangtok", state: "Sikkim", district: "Gangtok", lat: 27.3389, lng: 88.6065 },
  { name: "Namchi", state: "Sikkim", district: "Namchi", lat: 27.1667, lng: 88.35 },
  { name: "Mangan", state: "Sikkim", district: "Mangan", lat: 27.51, lng: 88.53 },
];

/** Quick lookup by place name. */
export const LOCATION_BY_NAME: Record<string, NerLocation> = Object.fromEntries(
  NER_LOCATIONS.map((l) => [l.name, l]),
);

/**
 * Risk score banding. Single source of truth — the helpers, the seed and the
 * frontend legend all derive from these boundaries.
 */
export const RISK_THRESHOLDS = {
  low: 25,
  moderate: 50,
  high: 75,
} as const;

/** Approximate geographic centre of the NER, used to centre the map. */
export const NER_CENTER = { lat: 25.9, lng: 92.6 } as const;

export const NER_DEFAULT_ZOOM = 7;

/** Bumped whenever the seed payload changes, to allow a controlled re-seed. */
export const SEED_VERSION = 3;
export const SEED_KEY = "ner-vision-demo-seed";

/* ------------------------------------------------------ terrain baseline */

/**
 * Static terrain-susceptibility index per location, 0 (flat alluvial plain)
 * to 1 (steep high-altitude slope).
 *
 * These are hand-assigned from the real physical geography of each district
 * headquarters — Tawang and Mangan sit on steep Himalayan slopes, Guwahati
 * and Agartala on floodplain. They are a documented static baseline, NOT a
 * DEM-derived slope raster. When Cartosat/SRTM elevation is ingested, this
 * table is replaced by real per-segment slope and the engine is unchanged.
 */
export const TERRAIN_INDEX: Record<string, number> = {
  // High Himalaya / steep cut-slope terrain
  Tawang: 1.0, Mangan: 0.95, Seppa: 0.92, Bomdila: 0.9, Ziro: 0.85,
  Gangtok: 0.85, Champhai: 0.8, Ukhrul: 0.8,
  // Hill terrain
  Shillong: 0.7, Aizawl: 0.72, Kohima: 0.72, Lunglei: 0.68, Jowai: 0.65,
  Namchi: 0.7, Mokokchung: 0.65, Nongpoh: 0.6, Churachandpur: 0.6,
  Itanagar: 0.58, Tura: 0.55, Pasighat: 0.45,
  // Valley / plains
  Imphal: 0.32, Dimapur: 0.25, Tezpur: 0.2, Silchar: 0.18, Jorhat: 0.15,
  Nagaon: 0.14, Guwahati: 0.18, Dibrugarh: 0.12, Dharmanagar: 0.2,
  Agartala: 0.12, Udaipur: 0.15,
};

/**
 * Static flood-exposure index per location, 0 to 1.
 *
 * Reflects proximity to the Brahmaputra and Barak systems and known annual
 * inundation. Placeholder for CWC gauge data and SAR-derived flood extent.
 */
export const FLOOD_INDEX: Record<string, number> = {
  Silchar: 0.9, Nagaon: 0.75, Dibrugarh: 0.7, Guwahati: 0.62, Tezpur: 0.6,
  Jorhat: 0.5, Imphal: 0.5, Dharmanagar: 0.45, Agartala: 0.4, Udaipur: 0.35,
  Pasighat: 0.55, Dimapur: 0.3, Tura: 0.3, Nongpoh: 0.25, Itanagar: 0.25,
  Shillong: 0.15, Jowai: 0.15, Aizawl: 0.1, Kohima: 0.12, Lunglei: 0.1,
  Mokokchung: 0.12, Churachandpur: 0.2, Ukhrul: 0.12, Champhai: 0.1,
  Gangtok: 0.15, Namchi: 0.15, Mangan: 0.2, Bomdila: 0.1, Ziro: 0.15,
  Seppa: 0.2, Tawang: 0.08,
};

/** Radius within which a confirmed incident influences a location's risk. */
export const INCIDENT_INFLUENCE_KM = 30;

/** Version stamp written onto every prediction this engine produces. */
export const RISK_ENGINE_VERSION = "ner-rule-engine-v1";

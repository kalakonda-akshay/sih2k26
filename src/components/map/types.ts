import type { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** The single payload every map layer reads from. */
export type MapIntelligence = FunctionReturnType<
  typeof api.map.getIntelligence
>;

export type MapVehicle = MapIntelligence["vehicles"][number];
export type MapIncident = MapIntelligence["incidents"][number];
export type MapRoad = MapIntelligence["roads"][number];
export type MapPrediction = MapIntelligence["predictions"][number];
export type MapWeather = MapIntelligence["weather"][number];

export interface LayerToggles {
  vehicles: boolean;
  incidents: boolean;
  roads: boolean;
  risk: boolean;
  weather: boolean;
}

export interface MapFilters {
  layers: LayerToggles;
  state: string;
  district: string;
  vehicleStatus: string;
  incidentType: string;
  riskLevel: string;
  accessibility: string;
}

/**
 * A request to move the camera. `key` is bumped on every request so that
 * clicking the same panel item twice still re-centres the map.
 */
export interface FocusTarget {
  lat: number;
  lng: number;
  zoom?: number;
  key: number;
}

export const ALL = "all";

export const DEFAULT_FILTERS: MapFilters = {
  layers: {
    vehicles: true,
    incidents: true,
    roads: true,
    risk: true,
    weather: false,
  },
  state: ALL,
  district: ALL,
  vehicleStatus: ALL,
  incidentType: ALL,
  riskLevel: ALL,
  accessibility: ALL,
};

/** Named presets for the quick-filter row. */
export type QuickFilter =
  | "all"
  | "critical"
  | "vehicles"
  | "incidents"
  | "roads"
  | "risk";

export const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: "all", label: "All Intelligence" },
  { id: "critical", label: "Critical Only" },
  { id: "vehicles", label: "Vehicles" },
  { id: "incidents", label: "Incidents" },
  { id: "roads", label: "Road Status" },
  { id: "risk", label: "AI Risk" },
];

export function applyQuickFilter(
  current: MapFilters,
  preset: QuickFilter,
): MapFilters {
  const base: MapFilters = {
    ...current,
    vehicleStatus: ALL,
    incidentType: ALL,
    riskLevel: ALL,
    accessibility: ALL,
  };

  switch (preset) {
    case "all":
      return {
        ...base,
        layers: {
          vehicles: true,
          incidents: true,
          roads: true,
          risk: true,
          weather: false,
        },
      };
    case "critical":
      // Everything currently demanding attention, across every layer.
      return {
        ...base,
        layers: {
          vehicles: true,
          incidents: true,
          roads: true,
          risk: true,
          weather: true,
        },
        riskLevel: "critical",
        accessibility: "blocked",
      };
    case "vehicles":
      return {
        ...base,
        layers: {
          vehicles: true,
          incidents: false,
          roads: true,
          risk: false,
          weather: false,
        },
      };
    case "incidents":
      return {
        ...base,
        layers: {
          vehicles: false,
          incidents: true,
          roads: true,
          risk: false,
          weather: false,
        },
      };
    case "roads":
      return {
        ...base,
        layers: {
          vehicles: false,
          incidents: false,
          roads: true,
          risk: false,
          weather: false,
        },
      };
    case "risk":
      return {
        ...base,
        layers: {
          vehicles: false,
          incidents: false,
          roads: true,
          risk: true,
          weather: true,
        },
      };
  }
}

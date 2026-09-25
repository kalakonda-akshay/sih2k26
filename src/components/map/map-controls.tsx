"use client";

import { useState } from "react";
import {
  ChevronDown,
  CloudRain,
  Compass,
  Layers,
  Map,
  Maximize,
  Minimize,
  Mountain,
  Navigation,
  RotateCcw,
  Ruler,
  Satellite,
  Scan,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ALL,
  applyQuickFilter,
  DEFAULT_FILTERS,
  QUICK_FILTERS,
  type BasemapStyle,
  type LayerToggles,
  type MapFilters,
  type MapIntelligence,
} from "./types";
import { cn } from "@/lib/utils";
import {
  getTranslatedVehicleStatus,
  getTranslatedIncidentType,
  getTranslatedRiskLevel,
  getTranslatedAccessibility,
} from "@/lib/risk";

const BASEMAP_OPTIONS: Array<{
  id: BasemapStyle;
  labelKey: string;
  defaultLabel: string;
  icon: typeof Map;
}> = [
  { id: "satellite", labelKey: "map.basemap_satellite", defaultLabel: "Satellite", icon: Satellite },
  { id: "topo", labelKey: "map.basemap_topo", defaultLabel: "Topo", icon: Mountain },
  { id: "streets", labelKey: "map.basemap_streets", defaultLabel: "Streets", icon: Navigation },
  { id: "dark", labelKey: "map.basemap_dark", defaultLabel: "Dark", icon: Map },
];

/**
 * Upgraded Tactical Map control panel.
 * Includes basemap switcher (Dark, Satellite, Topo, Streets), live Doppler radar toggle,
 * interactive distance ruler, fit-bounds, NER reset, and fullscreen toggles.
 */
export function MapControls({
  filters,
  onChange,
  facets,
  counts,
  measureMode,
  onToggleMeasure,
  onFitAll,
  onResetView,
  isFullscreen,
  onToggleFullscreen,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
  facets: MapIntelligence["facets"];
  counts: { vehicles: number; incidents: number; roads: number; risk: number };
  measureMode?: boolean;
  onToggleMeasure?: () => void;
  onFitAll?: () => void;
  onResetView?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  const districts =
    filters.state === ALL ? [] : (facets.districtsByState[filters.state] ?? []);

  const activeFieldFilters = [
    filters.state,
    filters.district,
    filters.vehicleStatus,
    filters.incidentType,
    filters.riskLevel,
    filters.accessibility,
  ].filter((v) => v !== ALL).length;

  const set = (patch: Partial<MapFilters>) =>
    onChange({ ...filters, ...patch });

  const toggleLayer = (key: keyof LayerToggles) =>
    onChange({
      ...filters,
      layers: { ...filters.layers, [key]: !filters.layers[key] },
    });

  const layerLabels: Record<keyof LayerToggles, string> = {
    vehicles: t("map.layer_vehicles", "Vehicles"),
    incidents: t("map.layer_incidents", "Incidents"),
    roads: t("map.layer_roads", "Roads"),
    risk: t("risk.title", "AI Risk"),
    weather: t("map.layer_weather", "Weather"),
    radar: t("map.layer_radar", "Radar"),
  };

  return (
    <div className="border-b border-border bg-card">
      {/* Tier 1: Quick filters and Basemap Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        {/* Quick view presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {t("common.filter", "Quick view")}
          </span>
          {QUICK_FILTERS.map((preset) => {
            const quickLabel =
              preset.id === "all"
                ? t("map.filter_all", "All Intelligence")
                : preset.id === "critical"
                  ? t("map.filter_critical", "Critical Only")
                  : preset.id === "vehicles"
                    ? t("map.layer_vehicles", "Vehicles")
                    : preset.id === "incidents"
                      ? t("map.layer_incidents", "Incidents")
                      : preset.id === "roads"
                        ? t("map.layer_roads", "Road Status")
                        : t("risk.title", "AI Risk");

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(applyQuickFilter(filters, preset.id))}
                className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {quickLabel}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RotateCcw className="size-3" />
            {t("common.reset", "Reset")}
          </button>
        </div>

        {/* Basemap Switcher */}
        <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/30 p-0.5">
          <span className="px-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {t("map.basemap", "Basemap")}
          </span>
          {BASEMAP_OPTIONS.map((bm) => {
            const Icon = bm.icon;
            const isSelected = filters.basemap === bm.id;
            return (
              <button
                key={bm.id}
                type="button"
                onClick={() => set({ basemap: bm.id })}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={t(bm.labelKey, bm.defaultLabel)}
              >
                <Icon className="size-2.5" />
                <span className="hidden sm:inline">{t(bm.labelKey, bm.defaultLabel)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier 2: Layer Toggles and Tactical Utility Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
        {/* Layer toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="mr-0.5 size-3.5 text-muted-foreground" />
          {(["vehicles", "incidents", "roads", "risk", "weather", "radar"] as const).map((key) => {
            const on = filters.layers[key];
            const label = layerLabels[key];
            const count =
              key === "vehicles"
                ? counts.vehicles
                : key === "incidents"
                  ? counts.incidents
                  : key === "roads"
                    ? counts.roads
                    : key === "risk"
                      ? counts.risk
                      : null;

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleLayer(key)}
                aria-pressed={on}
                className={cn(
                  "flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  on
                    ? key === "radar"
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-400 font-semibold"
                      : "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "radar" && <CloudRain className="size-2.5 animate-pulse" />}
                {label}
                {count !== null && (
                  <span className="tabular opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Utility action tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Distance Measure Tool */}
          {onToggleMeasure && (
            <button
              type="button"
              onClick={onToggleMeasure}
              title={t("map.measure_distance", "Measure Distance")}
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                measureMode
                  ? "border-sky-500 bg-sky-500/20 text-sky-400 font-semibold shadow-sm"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <Ruler className="size-3" />
              <span className="hidden sm:inline">{t("map.measure_distance", "Measure")}</span>
            </button>
          )}

          {/* Fit all active entities */}
          {onFitAll && (
            <button
              type="button"
              onClick={onFitAll}
              title={t("map.fit_bounds", "Fit all active entities")}
              className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <Scan className="size-3" />
              <span className="hidden sm:inline">{t("map.fit_bounds", "Fit All")}</span>
            </button>
          )}

          {/* Reset NER overview */}
          {onResetView && (
            <button
              type="button"
              onClick={onResetView}
              title={t("map.reset_view", "Reset to Northeast Overview")}
              className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <Compass className="size-3" />
              <span className="hidden sm:inline">{t("map.reset_view", "NER View")}</span>
            </button>
          )}

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? t("map.exit_fullscreen", "Exit Fullscreen") : t("map.fullscreen", "Fullscreen")}
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                isFullscreen
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {isFullscreen ? <Minimize className="size-3" /> : <Maximize className="size-3" />}
              <span className="hidden sm:inline">
                {isFullscreen ? t("map.exit_fullscreen", "Exit") : t("map.fullscreen", "Fullscreen")}
              </span>
            </button>
          )}

          {/* Detailed field filter disclosure */}
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className={cn(
              "flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activeFieldFilters > 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="size-3" />
            {t("common.filter", "Filters")}
            {activeFieldFilters > 0 && (
              <span className="tabular">{activeFieldFilters}</span>
            )}
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                showFilters && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* Field filters */}
      {showFilters && (
        <div className="grid gap-2.5 border-t border-border px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label={t("incidents.district", "State")}
            value={filters.state}
            onChange={(v) => set({ state: v, district: ALL })}
            options={facets.states}
          />
          <Select
            label={t("incidents.district", "District")}
            value={filters.district}
            onChange={(v) => set({ district: v })}
            options={districts}
            disabled={filters.state === ALL}
            placeholder={
              filters.state === ALL ? t("common.filter", "Select a state first") : t("map.filter_all", "All districts")
            }
          />
          <Select
            label={t("vehicles.status", "Vehicle status")}
            value={filters.vehicleStatus}
            onChange={(v) => set({ vehicleStatus: v })}
            options={["active", "idle", "delayed", "emergency", "offline"]}
            formatOption={(opt) => getTranslatedVehicleStatus(opt, t)}
          />
          <Select
            label={t("incidents.incident_type", "Incident type")}
            value={filters.incidentType}
            onChange={(v) => set({ incidentType: v })}
            options={[
              "landslide",
              "flood",
              "road_damage",
              "bridge_damage",
              "accident",
              "traffic",
              "other",
            ]}
            formatOption={(opt) => getTranslatedIncidentType(opt, t)}
          />
          <Select
            label={t("risk.level", "Risk level")}
            value={filters.riskLevel}
            onChange={(v) => set({ riskLevel: v })}
            options={["low", "moderate", "high", "critical"]}
            formatOption={(opt) => getTranslatedRiskLevel(opt, t)}
          />
          <Select
            label={t("map.legend_roads", "Road accessibility")}
            value={filters.accessibility}
            onChange={(v) => set({ accessibility: v })}
            options={["accessible", "restricted", "blocked"]}
            formatOption={(opt) => getTranslatedAccessibility(opt, t)}
          />
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  formatOption?: (opt: string) => string;
}) {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder ?? t("common.all", "All");

  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <option value={ALL}>{defaultPlaceholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption ? formatOption(option) : option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

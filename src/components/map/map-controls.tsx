"use client";

import { useState } from "react";
import { ChevronDown, Layers, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  ALL,
  applyQuickFilter,
  DEFAULT_FILTERS,
  QUICK_FILTERS,
  type LayerToggles,
  type MapFilters,
  type MapIntelligence,
} from "./types";
import { cn } from "@/lib/utils";

const LAYER_LABELS: Array<{ key: keyof LayerToggles; label: string }> = [
  { key: "vehicles", label: "Vehicles" },
  { key: "incidents", label: "Incidents" },
  { key: "roads", label: "Roads" },
  { key: "risk", label: "AI Risk" },
  { key: "weather", label: "Weather" },
];

/**
 * Map control panel.
 *
 * Two tiers by design: the quick-filter presets and layer toggles are always
 * visible because they carry most of the value, while the six field-level
 * filters live behind a disclosure so the default view stays uncrowded.
 */
export function MapControls({
  filters,
  onChange,
  facets,
  counts,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
  facets: MapIntelligence["facets"];
  counts: { vehicles: number; incidents: number; roads: number; risk: number };
}) {
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

  return (
    <div className="border-b border-border">
      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
        <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Quick view
        </span>
        {QUICK_FILTERS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(applyQuickFilter(filters, preset.id))}
            className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="ml-auto flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      {/* Layers */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-2.5">
        <Layers className="mr-0.5 size-3.5 text-muted-foreground" />
        {LAYER_LABELS.map(({ key, label }) => {
          const on = filters.layers[key];
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
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {count !== null && (
                <span className="tabular opacity-70">{count}</span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeFieldFilters > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3" />
          Filters
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

      {/* Field filters */}
      {showFilters && (
        <div className="grid gap-2.5 border-t border-border px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="State"
            value={filters.state}
            onChange={(v) => set({ state: v, district: ALL })}
            options={facets.states}
          />
          <Select
            label="District"
            value={filters.district}
            onChange={(v) => set({ district: v })}
            options={districts}
            disabled={filters.state === ALL}
            placeholder={
              filters.state === ALL ? "Select a state first" : "All districts"
            }
          />
          <Select
            label="Vehicle status"
            value={filters.vehicleStatus}
            onChange={(v) => set({ vehicleStatus: v })}
            options={["active", "idle", "delayed", "emergency", "offline"]}
          />
          <Select
            label="Incident type"
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
          />
          <Select
            label="Risk level"
            value={filters.riskLevel}
            onChange={(v) => set({ riskLevel: v })}
            options={["low", "moderate", "high", "critical"]}
          />
          <Select
            label="Road accessibility"
            value={filters.accessibility}
            onChange={(v) => set({ accessibility: v })}
            options={["accessible", "restricted", "blocked"]}
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
  placeholder = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
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
        <option value={ALL}>{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

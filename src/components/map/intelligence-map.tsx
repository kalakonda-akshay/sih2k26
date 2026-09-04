"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Loader2, PanelRightOpen } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MapControls } from "./map-controls";
import { MapLegend } from "./map-legend";
import { IntelligencePanel } from "./intelligence-panel";
import {
  ALL,
  DEFAULT_FILTERS,
  type FocusTarget,
  type MapFilters,
  type MapIntelligence,
} from "./types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Leaflet reads `window` at import time, so the canvas is client-only. This
 * wrapper stays server-renderable and owns everything around the map: filter
 * state, the focus request, and the responsive layout.
 */
const MapCanvas = dynamic(
  () => import("./map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[oklch(0.135_0.011_245)]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-wider">
            Loading map
          </span>
        </div>
      </div>
    ),
  },
);

const EMPTY: MapIntelligence = {
  vehicles: [],
  incidents: [],
  roads: [],
  predictions: [],
  weather: [],
  facets: { states: [], districtsByState: {} },
};

export function IntelligenceMap({
  className,
  /** Compact mode drops the controls and side panel — used on the dashboard. */
  compact = false,
  height,
  externalFocus = null,
  highlightRoadIds,
}: {
  className?: string;
  compact?: boolean;
  height?: string;
  /**
   * Camera target driven from outside the map — used by Vehicle Tracking to
   * follow a selected vehicle. Takes precedence over the map's own panel
   * selection while it is set.
   */
  externalFocus?: FocusTarget | null;
  /** Road ids belonging to a selected route, emphasised over the rest. */
  highlightRoadIds?: string[];
}) {
  const data = useQuery(api.map.getIntelligence);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [focus, setFocus] = useState<FocusTarget | null>(null);

  const onFocus = useCallback((lat: number, lng: number, zoom?: number) => {
    // Bumping the key on every call makes repeat clicks re-centre the map.
    setFocus({ lat, lng, zoom, key: Date.now() });
  }, []);

  /**
   * Filtering happens here rather than in Convex: the whole NER working set
   * is a few hundred documents, so filtering in memory is instant and avoids
   * a round trip (and a re-subscription) on every control change.
   *
   * Note that vehicles carry no state/district field — they move between
   * them — so the geographic filters intentionally do not narrow the fleet.
   */
  const filtered = useMemo<MapIntelligence>(() => {
    if (!data) return EMPTY;

    const geoMatch = (state: string, district: string) =>
      (filters.state === ALL || state === filters.state) &&
      (filters.district === ALL || district === filters.district);

    return {
      facets: data.facets,
      vehicles: data.vehicles.filter(
        (v) =>
          (filters.vehicleStatus === ALL ||
            v.status === filters.vehicleStatus) &&
          (filters.riskLevel === ALL || v.riskLevel === filters.riskLevel),
      ),
      incidents: data.incidents.filter(
        (i) =>
          geoMatch(i.state, i.district) &&
          (filters.incidentType === ALL ||
            i.incidentType === filters.incidentType),
      ),
      roads: data.roads.filter(
        (r) =>
          geoMatch(r.state, r.district) &&
          (filters.accessibility === ALL ||
            r.accessibilityStatus === filters.accessibility) &&
          (filters.riskLevel === ALL || r.riskLevel === filters.riskLevel),
      ),
      predictions: data.predictions.filter(
        (p) =>
          geoMatch(p.state, p.district) &&
          (filters.riskLevel === ALL || p.riskLevel === filters.riskLevel),
      ),
      weather: data.weather.filter((w) =>
        geoMatch(w.state ?? "", w.district ?? ""),
      ),
    };
  }, [data, filters]);

  // An external request wins while present; otherwise the panel drives.
  const activeFocus = externalFocus ?? focus;

  const counts = {
    vehicles: filtered.vehicles.length,
    incidents: filtered.incidents.length,
    roads: filtered.roads.length,
    risk: filtered.predictions.length,
  };

  const mapHeight =
    height ?? (compact ? "h-[380px] sm:h-[460px] lg:h-[520px]" : "h-full");

  const canvas = (
    <div className={cn("relative w-full", mapHeight)}>
      <MapCanvas data={filtered} layers={filters.layers} focus={activeFocus} highlightRoadIds={highlightRoadIds} />
      <MapLegend />
    </div>
  );

  /* ------------------------------------------------ compact (dashboard) */
  if (compact) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border bg-card",
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Live Logistics Map</h3>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {data
                ? `${counts.vehicles} vehicles · ${counts.incidents} incidents · ${counts.roads} segments`
                : "Connecting…"}
            </p>
          </div>
          <Link
            href="/map"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "ml-auto text-xs",
            )}
          >
            Open full map
          </Link>
        </div>
        {canvas}
      </div>
    );
  }

  /* ------------------------------------------------------- full page */
  return (
    <div className={cn("flex min-h-0 flex-col gap-4 lg:flex-row", className)}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <MapControls
          filters={filters}
          onChange={setFilters}
          facets={filtered.facets}
          counts={counts}
        />

        {/* Panel trigger, below the side-panel breakpoint. */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {data
              ? `${counts.vehicles} vehicles · ${counts.incidents} incidents`
              : "Connecting…"}
          </span>
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="ml-auto text-xs" />
              }
            >
              <PanelRightOpen className="size-3.5" />
              Intelligence
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] p-0">
              <SheetTitle className="sr-only">Live intelligence</SheetTitle>
              <IntelligencePanel
                data={data}
                onFocus={onFocus}
                className="h-full rounded-none border-0"
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="relative min-h-[420px] flex-1">
          <MapCanvas data={filtered} layers={filters.layers} focus={activeFocus} highlightRoadIds={highlightRoadIds} />
          <MapLegend />
        </div>
      </div>

      <IntelligencePanel
        data={data}
        onFocus={onFocus}
        className="hidden w-full shrink-0 lg:flex lg:w-[340px]"
      />
    </div>
  );
}

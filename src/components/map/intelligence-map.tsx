"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Loader2, Map, Mountain, Navigation, PanelRightOpen, Satellite } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import {
  SIMULATED_CONVOYS,
  type ConvoyDefinition,
} from "./convoy-types";
import { ConvoySimulatorHud } from "./convoy-simulator-hud";
import { ConvoyElevationProfile } from "./convoy-elevation-profile";



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
            Loading tactical map
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
  const { t } = useTranslation();
  const data = useQuery(api.map.getIntelligence);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [focus, setFocus] = useState<FocusTarget | null>(null);

  // Upgraded tactical controls state
  const [measureMode, setMeasureMode] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number | undefined>();
  const [resetViewTrigger, setResetViewTrigger] = useState<number | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Convoy simulation state
  const [selectedConvoy, setSelectedConvoy] = useState<ConvoyDefinition>(SIMULATED_CONVOYS[0]);
  const [convoyProgress, setConvoyProgress] = useState(0.12);
  const [isConvoyPlaying, setIsConvoyPlaying] = useState(false);
  const [convoySpeed, setConvoySpeed] = useState(1);
  const [isConvoyDiverted, setIsConvoyDiverted] = useState(false);
  const [followConvoy, setFollowConvoy] = useState(false);
  const [geoFenceBreached, setGeoFenceBreached] = useState(false);
  const [distToHazardKm, setDistToHazardKm] = useState(48);
  const [showElevationProfile, setShowElevationProfile] = useState(false);

  // Smooth transit animation loop
  useEffect(() => {
    if (!isConvoyPlaying) return;
    const interval = setInterval(() => {
      setConvoyProgress((prev) => {
        const next = prev + 0.0012 * convoySpeed;
        if (next >= 1) {
          setIsConvoyPlaying(false);
          return 1;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isConvoyPlaying, convoySpeed]);


  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (mapContainerRef.current?.requestFullscreen) {
        mapContainerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const onFocus = useCallback((lat: number, lng: number, zoom?: number) => {
    // Bumping the key on every call makes repeat clicks re-centre the map.
    setFocus({ lat, lng, zoom, key: Date.now() });
  }, []);

  /**
   * Filtering happens here rather than in Convex: the whole NER working set
   * is a few hundred documents, so filtering in memory is instant and avoids
   * a round trip (and a re-subscription) on every control change.
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
    <div className={cn("relative w-full overflow-hidden isolate z-0", mapHeight)}>
      <MapCanvas
        data={filtered}
        layers={filters.layers}
        focus={activeFocus}
        highlightRoadIds={highlightRoadIds}
        basemap={filters.basemap}
        measureMode={measureMode}
        onCloseMeasure={() => setMeasureMode(false)}
        fitBoundsTrigger={fitBoundsTrigger}
        resetViewTrigger={resetViewTrigger}
        simulatingConvoy={true}
        convoy={selectedConvoy}
        convoyProgress={convoyProgress}
        convoyDiverted={isConvoyDiverted}
        onGeoFenceBreach={(breached, dist) => {
          setGeoFenceBreached(breached);
          setDistToHazardKm(dist);
        }}
        followConvoy={followConvoy}
      />
      <ConvoySimulatorHud
        selectedConvoy={selectedConvoy}
        onSelectConvoy={(c) => setSelectedConvoy(c)}
        progress={convoyProgress}
        onChangeProgress={setConvoyProgress}
        isPlaying={isConvoyPlaying}
        onTogglePlay={() => setIsConvoyPlaying((p) => !p)}
        speed={convoySpeed}
        onChangeSpeed={setConvoySpeed}
        isDiverted={isConvoyDiverted}
        onToggleDivert={() => setIsConvoyDiverted((d) => !d)}
        followVehicle={followConvoy}
        onToggleFollow={() => setFollowConvoy((f) => !f)}
        geoFenceBreached={geoFenceBreached}
        distToHazardKm={distToHazardKm}
      />
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {t("dashboard.live_logistics_map", "Live Logistics Map")}
            </h3>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {data
                ? `${t("dashboard.vehicles_count", { count: counts.vehicles })} · ${t("dashboard.incidents_count", { count: counts.incidents })} · ${t("dashboard.segments_count", { count: counts.roads })}`
                : t("header.connecting", "Connecting…")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Basemap Switcher */}
            <div className="flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/40 p-0.5">
              {[
                { id: "satellite" as const, label: t("map.basemap_satellite", "Satellite"), icon: Satellite },
                { id: "topo" as const, label: t("map.basemap_topo", "Topo"), icon: Mountain },
                { id: "streets" as const, label: t("map.basemap_streets", "Streets"), icon: Navigation },
                { id: "dark" as const, label: t("map.basemap_dark", "Dark"), icon: Map },
              ].map((bm) => {
                const Icon = bm.icon;
                const isSelected = filters.basemap === bm.id;
                return (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, basemap: bm.id }))}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    title={bm.label}
                  >
                    <Icon className="size-2.5" />
                    <span>{bm.label}</span>
                  </button>
                );
              })}
            </div>

            <Link
              href="/map"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "text-xs shrink-0",
              )}
            >
              {t("dashboard.open_full_map", "Open full map")}
            </Link>
          </div>
        </div>
        {canvas}
      </div>
    );
  }

  /* ------------------------------------------------------- full page */
  return (
    <div
      ref={mapContainerRef}
      className={cn(
        "flex min-h-0 flex-col gap-4 lg:flex-row",
        isFullscreen && "fixed inset-0 z-50 bg-background p-4",
        className,
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <MapControls
          filters={filters}
          onChange={setFilters}
          facets={filtered.facets}
          counts={counts}
          measureMode={measureMode}
          onToggleMeasure={() => setMeasureMode((m) => !m)}
          onFitAll={() => setFitBoundsTrigger(Date.now())}
          onResetView={() => setResetViewTrigger(Date.now())}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Panel trigger, below the side-panel breakpoint. */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {data
              ? `${t("dashboard.vehicles_count", { count: counts.vehicles })} · ${t("dashboard.incidents_count", { count: counts.incidents })}`
              : t("header.connecting", "Connecting…")}
          </span>
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="ml-auto text-xs" />
              }
            >
              <PanelRightOpen className="size-3.5" />
              {t("dashboard.intelligence", "Intelligence")}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] p-0">
              <SheetTitle className="sr-only">
                {t("dashboard.live_intelligence", "Live intelligence")}
              </SheetTitle>
              <IntelligencePanel
                data={data}
                onFocus={onFocus}
                className="h-full rounded-none border-0"
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="relative min-h-[420px] flex-1 overflow-hidden isolate z-0">
          <MapCanvas
            data={filtered}
            layers={filters.layers}
            focus={activeFocus}
            highlightRoadIds={highlightRoadIds}
            basemap={filters.basemap}
            measureMode={measureMode}
            onCloseMeasure={() => setMeasureMode(false)}
            fitBoundsTrigger={fitBoundsTrigger}
            resetViewTrigger={resetViewTrigger}
            simulatingConvoy={true}
            convoy={selectedConvoy}
            convoyProgress={convoyProgress}
            convoyDiverted={isConvoyDiverted}
            onGeoFenceBreach={(breached, dist) => {
              setGeoFenceBreached(breached);
              setDistToHazardKm(dist);
            }}
            followConvoy={followConvoy}
          />
          <ConvoySimulatorHud
            selectedConvoy={selectedConvoy}
            onSelectConvoy={(c) => setSelectedConvoy(c)}
            progress={convoyProgress}
            onChangeProgress={setConvoyProgress}
            isPlaying={isConvoyPlaying}
            onTogglePlay={() => setIsConvoyPlaying((p) => !p)}
            speed={convoySpeed}
            onChangeSpeed={setConvoySpeed}
            isDiverted={isConvoyDiverted}
            onToggleDivert={() => setIsConvoyDiverted((d) => !d)}
            followVehicle={followConvoy}
            onToggleFollow={() => setFollowConvoy((f) => !f)}
            geoFenceBreached={geoFenceBreached}
            distToHazardKm={distToHazardKm}
            showElevationProfile={showElevationProfile}
            onToggleElevationProfile={() => setShowElevationProfile((p) => !p)}
          />

          {/* 3D Mountain Elevation & Hairpin Slope Profile Drawer */}
          {showElevationProfile && (
            <div className="absolute bottom-4 left-4 right-4 z-20 max-w-3xl mx-auto pointer-events-auto">
              <ConvoyElevationProfile
                selectedConvoy={selectedConvoy}
                progress={convoyProgress}
                isDiverted={isConvoyDiverted}
                onToggleDivert={() => setIsConvoyDiverted((d) => !d)}
              />
            </div>
          )}

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

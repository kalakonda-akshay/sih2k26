"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { RoadLayer } from "./layers/road-layer";
import { IncidentLayer } from "./layers/incident-layer";
import { VehicleLayer } from "./layers/vehicle-layer";
import { RiskLayer } from "./layers/risk-layer";
import { WeatherLayer } from "./layers/weather-layer";
import { RadarLayer } from "./layers/radar-layer";
import { MeasureLayer } from "./layers/measure-layer";
import { ConvoySimulationLayer, type ConvoyDefinition } from "./layers/convoy-simulation-layer";
import type { BasemapStyle, FocusTarget, LayerToggles, MapIntelligence } from "./types";


const NER_CENTER: [number, number] = [25.9, 92.6];
const DEFAULT_ZOOM = 6;

/**
 * Tracks the live zoom level so point layers can decide whether to cluster.
 */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

/**
 * Moves the camera when the intelligence panel requests a location.
 */
function FlyToController({ target }: { target: FocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 10, {
      duration: 0.9,
    });
  }, [target, map]);

  return null;
}

/** Automatically invalidates map size after mount or resize to prevent blank tiles */
function InvalidateSizeController() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

/**
 * Fits bounds to all currently active vehicles, incidents, and road networks.
 */
function FitBoundsController({
  trigger,
  data,
}: {
  trigger?: number;
  data: MapIntelligence;
}) {
  const map = useMap();

  useEffect(() => {
    if (!trigger) return;
    const points: [number, number][] = [];
    data.vehicles.forEach((v) => points.push([v.latitude, v.longitude]));
    data.incidents.forEach((i) => points.push([i.latitude, i.longitude]));
    data.roads.forEach((r) => {
      points.push([r.startLatitude, r.startLongitude]);
      points.push([r.endLatitude, r.endLongitude]);
    });

    if (points.length === 0) {
      map.flyTo(NER_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
      return;
    }

    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
  }, [trigger, data, map]);

  return null;
}

/**
 * Resets the map camera back to the Northeast India overview.
 */
function ResetViewController({ trigger }: { trigger?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!trigger) return;
    map.flyTo(NER_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
  }, [trigger, map]);

  return null;
}

/**
 * Live tactical HUD displaying real-time cursor coordinates and current zoom level.
 */
function CoordinatesHud() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  useMapEvents({
    mousemove: (e) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    zoomend: (e) => {
      setZoom(e.target.getZoom());
    },
  });

  return (
    <div
      className="leaflet-bottom leaflet-right pointer-events-none"
      style={{ bottom: "10px", right: "12px", zIndex: 850 }}
    >
      <div className="flex items-center gap-2 rounded border border-border/80 bg-background/85 px-2.5 py-1 font-mono text-[10px] text-muted-foreground shadow-md backdrop-blur-sm">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-foreground">NER HUD</span>
        <span>·</span>
        <span>
          {coords
            ? `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`
            : "25.9000°N, 92.6000°E"}
        </span>
        <span>·</span>
        <span>Z{zoom}</span>
      </div>
    </div>
  );
}

/**
 * Modern Tactical Zoom In & Zoom Out HUD.
 * Positioned cleanly below top-left telemetry overlays with smooth zoom controls,
 * real-time zoom multiplier indicator, re-center view button, and sleek glassmorphism styling.
 */
function TacticalZoomControl() {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

  useMapEvents({
    zoomend: (e) => {
      setCurrentZoom(Math.round(e.target.getZoom()));
    },
  });

  return (
    <div
      className="leaflet-top leaflet-left pointer-events-auto select-none"
      style={{ top: "86px", left: "16px", zIndex: 850 }}
    >
      <div className="flex flex-col items-center rounded-lg border border-cyan-500/50 bg-[#080d16]/95 shadow-2xl backdrop-blur-md overflow-hidden font-mono text-xs">
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="Zoom In"
          title="Zoom In (+)"
          className="flex size-8 items-center justify-center text-cyan-400 hover:bg-cyan-500/20 hover:text-white active:bg-cyan-500/40 transition-colors border-b border-border/70"
        >
          <Plus className="size-4" />
        </button>

        {/* Current Zoom Level Badge */}
        <div
          title={`Current Zoom Level: ${currentZoom}x`}
          className="flex h-5 w-8 items-center justify-center bg-black/70 text-[9px] font-bold text-cyan-300 border-b border-border/70 cursor-default"
        >
          Z{currentZoom}
        </div>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="Zoom Out"
          title="Zoom Out (-)"
          className="flex size-8 items-center justify-center text-cyan-400 hover:bg-cyan-500/20 hover:text-white active:bg-cyan-500/40 transition-colors border-b border-border/70"
        >
          <Minus className="size-4" />
        </button>

        {/* Re-center / Reset NER Overview */}
        <button
          type="button"
          onClick={() => map.flyTo(NER_CENTER, DEFAULT_ZOOM, { duration: 0.8 })}
          aria-label="Reset View"
          title="Reset View to Northeast India Overview"
          className="flex size-8 items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Upgraded Leaflet Map Canvas.
 * Supports multiple basemaps (Dark Tactical, High-Res Satellite, Topographic Relief, Streets),
 * live Doppler weather radar, tactical measure tool, fit-all bounds, and coordinate HUD.
 */
export function MapCanvas({
  data,
  layers,
  focus,
  highlightRoadIds,
  basemap = "satellite",
  measureMode = false,
  onCloseMeasure,
  fitBoundsTrigger,
  resetViewTrigger,
  simulatingConvoy = true,
  convoy,
  convoyProgress = 0,
  convoyDiverted = false,
  onGeoFenceBreach,
  followConvoy = false,
}: {
  data: MapIntelligence;
  layers: LayerToggles;
  focus: FocusTarget | null;
  highlightRoadIds?: string[];
  basemap?: BasemapStyle;
  measureMode?: boolean;
  onCloseMeasure?: () => void;
  fitBoundsTrigger?: number;
  resetViewTrigger?: number;
  simulatingConvoy?: boolean;
  convoy?: ConvoyDefinition;
  convoyProgress?: number;
  convoyDiverted?: boolean;
  onGeoFenceBreach?: (breached: boolean, distKm: number) => void;
  followConvoy?: boolean;
}) {

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  return (
    <MapContainer
      center={NER_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={5}
      maxZoom={16}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ background: "oklch(0.135 0.011 245)" }}
    >
      {/* -------------------- DYNAMIC BASEMAP LAYERS -------------------- */}
      {basemap === "dark" && (
        <TileLayer
          key="dark-carto"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
      )}

      {basemap === "satellite" && (
        <>
          <TileLayer
            key="sat-base"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
            maxNativeZoom={15}
            maxZoom={18}
          />
          <TileLayer
            key="sat-labels"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
        </>
      )}

      {basemap === "topo" && (
        <TileLayer
          key="topo-base"
          url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, USGS, Intermap, Garmin'
          maxNativeZoom={15}
          maxZoom={18}
        />
      )}

      {basemap === "streets" && (
        <TileLayer
          key="streets-base"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
      )}

      {/* Controllers and HUD */}
      <TacticalZoomControl />
      <ZoomWatcher onZoom={setZoom} />
      <FlyToController target={focus} />
      <FitBoundsController trigger={fitBoundsTrigger} data={data} />
      <ResetViewController trigger={resetViewTrigger} />
      <CoordinatesHud />
      <InvalidateSizeController />

      {/* Dynamic Data Layers (order: radar & zones -> roads -> points) */}
      {layers.radar && <RadarLayer opacity={0.68} />}
      {layers.risk && <RiskLayer predictions={data.predictions} />}
      {layers.roads && <RoadLayer roads={data.roads} highlightRoadIds={highlightRoadIds} />}
      {layers.weather && <WeatherLayer weather={data.weather} />}
      {layers.incidents && (
        <IncidentLayer incidents={data.incidents} zoom={zoom} />
      )}
      {layers.vehicles && <VehicleLayer vehicles={data.vehicles} />}

      {/* Live Tactical Convoy Simulation Layer */}
      {simulatingConvoy && convoy && (
        <ConvoySimulationLayer
          convoy={convoy}
          progress={convoyProgress}
          isDiverted={convoyDiverted}
          onGeoFenceBreach={onGeoFenceBreach}
          followVehicle={followConvoy}
        />
      )}

      {/* Interactive Measure Tool */}
      <MeasureLayer active={measureMode} onClose={onCloseMeasure ?? (() => {})} />

    </MapContainer>
  );
}

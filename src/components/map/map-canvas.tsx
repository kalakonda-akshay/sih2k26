"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
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
      zoomControl
      className="h-full w-full"
      style={{ background: "oklch(0.135 0.011 245)" }}
    >
      {/* -------------------- DYNAMIC BASEMAP LAYERS -------------------- */}
      {basemap === "dark" && (
        <>
          <TileLayer
            key="dark-base"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, OpenStreetMap'
            maxZoom={16}
          />
          <TileLayer
            key="dark-ref"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
        </>
      )}

      {basemap === "satellite" && (
        <>
          <TileLayer
            key="sat-base"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
            maxZoom={17}
          />
          <TileLayer
            key="sat-ref"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={17}
          />
        </>
      )}

      {basemap === "topo" && (
        <TileLayer
          key="topo-base"
          url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, USGS, Intermap, Garmin'
          maxZoom={16}
        />
      )}

      {basemap === "streets" && (
        <TileLayer
          key="streets-base"
          url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, USGS, NGA'
          maxZoom={16}
        />
      )}

      {/* Controllers and HUD */}
      <ZoomWatcher onZoom={setZoom} />
      <FlyToController target={focus} />
      <FitBoundsController trigger={fitBoundsTrigger} data={data} />
      <ResetViewController trigger={resetViewTrigger} />
      <CoordinatesHud />

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

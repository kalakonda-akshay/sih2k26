"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { RoadLayer } from "./layers/road-layer";
import { IncidentLayer } from "./layers/incident-layer";
import { VehicleLayer } from "./layers/vehicle-layer";
import { RiskLayer } from "./layers/risk-layer";
import { WeatherLayer } from "./layers/weather-layer";
import type { FocusTarget, LayerToggles, MapIntelligence } from "./types";

const NER_CENTER: [number, number] = [25.9, 92.6];
const DEFAULT_ZOOM = 6;

/**
 * Tracks the live zoom level so point layers can decide whether to cluster.
 * Kept as its own component because `useMapEvents` must run inside the
 * MapContainer context.
 */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

/**
 * Moves the camera when the intelligence panel requests a location.
 * `target.key` changes on every request, so clicking the same item twice
 * re-centres rather than being deduplicated away by the effect.
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
 * Leaflet canvas.
 *
 * Loaded only on the client (see `intelligence-map.tsx`) because Leaflet
 * touches `window` at module scope. The MapContainer is mounted once and
 * never re-keyed — layers update in place as Convex pushes new data, so
 * panning and zoom survive every live update.
 *
 * The basemap is CARTO's dark raster tileset, which requires no API key, so
 * no credential is ever shipped to the browser.
 */
export function MapCanvas({
  data,
  layers,
  focus,
  highlightRoadIds,
}: {
  data: MapIntelligence;
  layers: LayerToggles;
  focus: FocusTarget | null;
  highlightRoadIds?: string[];
}) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  return (
    <MapContainer
      center={NER_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={5}
      maxZoom={14}
      scrollWheelZoom
      zoomControl
      className="h-full w-full"
      style={{ background: "oklch(0.135 0.011 245)" }}
    >
      {/*
        Esri "World Dark Gray Canvas", split into its base and label layers.

        CARTO's dark_all basemap was used originally, but CARTO now requires
        an API key and serves watermarked tiles without one — the request
        still returns HTTP 200 with a valid PNG, so the failure is only
        visible by looking at the image. Esri's dark canvas is free, needs no
        key, and matches the command-centre palette.

        Note the {z}/{y}/{x} order: Esri puts row before column, unlike the
        {z}/{x}/{y} convention most tile servers use.
      */}
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={16}
      />
      {/* Place names ship as a separate reference layer on this basemap. */}
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />

      <ZoomWatcher onZoom={setZoom} />
      <FlyToController target={focus} />

      {/* Order matters: zones sit under lines, lines under point markers. */}
      {layers.risk && <RiskLayer predictions={data.predictions} />}
      {layers.roads && <RoadLayer roads={data.roads} highlightRoadIds={highlightRoadIds} />}
      {layers.weather && <WeatherLayer weather={data.weather} />}
      {layers.incidents && (
        <IncidentLayer incidents={data.incidents} zoom={zoom} />
      )}
      {layers.vehicles && <VehicleLayer vehicles={data.vehicles} />}
    </MapContainer>
  );
}

"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPopup } from "../map-popup";
import type { MapWeather } from "../types";
import { humanize, timeAgo } from "@/lib/format";

/** IMD-style warning colours. "none" is neutral, not green — it is an absence. */
const ALERT_HEX: Record<string, string> = {
  none: "oklch(0.685 0.019 245)",
  yellow: "oklch(0.815 0.145 88)",
  orange: "oklch(0.727 0.163 55)",
  red: "oklch(0.648 0.201 22)",
};

/**
 * Weather intelligence layer.
 *
 * Renders the rainfall figure directly on the marker, because rainfall is the
 * variable that actually drives landslide and flood risk in this region —
 * making it readable without a click is the point of the layer.
 *
 * Data is currently seeded. `weather.createWeatherRecord` is the ingest point
 * for a real IMD or OpenWeather feed via a Convex action; nothing in this
 * component would need to change.
 */
export function WeatherLayer({ weather }: { weather: MapWeather[] }) {
  return (
    <>
      {weather.map((record) => {
        const hex = ALERT_HEX[record.alertLevel] ?? ALERT_HEX.none;
        const severe =
          record.alertLevel === "orange" || record.alertLevel === "red";

        const icon = L.divIcon({
          className: "",
          iconSize: [46, 18],
          iconAnchor: [23, 9],
          popupAnchor: [0, -10],
          html: `
            <div style="
              height:18px;padding:0 5px;border-radius:9px;
              display:flex;align-items:center;justify-content:center;gap:3px;
              background:oklch(0.158 0.012 245 / 0.85);
              border:1px solid ${hex};
              color:${hex};
              font:600 9px/1 ui-monospace,monospace;
              white-space:nowrap;
              ${severe ? `box-shadow:0 0 0 3px ${hex}1f;` : ""}
            ">${Math.round(record.rainfall)}mm</div>`,
        });

        return (
          <Marker
            key={record._id}
            position={[record.latitude, record.longitude]}
            icon={icon}
          >
            <Popup>
              <MapPopup
                eyebrow="Weather intelligence"
                title={record.locationName}
                toneHex={hex}
                toneLabel={
                  record.alertLevel === "none"
                    ? "No warning"
                    : `${humanize(record.alertLevel)} warning`
                }
                rows={[
                  ["Condition", humanize(record.weatherCondition)],
                  ["Rainfall (24h)", `${Math.round(record.rainfall)} mm`],
                  ["Temperature", `${Math.round(record.temperature)} °C`],
                  ["Humidity", `${Math.round(record.humidity)} %`],
                  ["Wind", `${Math.round(record.windSpeed)} km/h`],
                  ["Recorded", timeAgo(record.recordedAt)],
                ]}
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

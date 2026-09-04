"use client";

import { useMemo } from "react";
import { Polyline, Popup } from "react-leaflet";
import { MapPopup } from "../map-popup";
import type { MapRoad } from "../types";
import {
  ACCESS_TONE,
  RISK_TONE,
  type AccessibilityStatus,
  type RiskLevel,
} from "@/lib/risk";
import { humanize, timeAgo } from "@/lib/format";

/**
 * Road accessibility layer.
 *
 * Colour encodes accessibility first and risk band second: an accessible road
 * is shaded by how risky it is, while a restricted or blocked road takes the
 * unambiguous warning colour regardless of score. Blocked segments are also
 * dashed and thicker, so the layer stays readable in greyscale and to
 * colour-blind viewers.
 *
 * Geometry is the seeded GeoJSON LineString where present, falling back to a
 * straight start→end chord. These corridors are representative demonstration
 * geometry, not a surveyed government road network.
 */
export function RoadLayer({
  roads,
  highlightRoadIds,
}: {
  roads: MapRoad[];
  /** Segments on a selected route — drawn thicker, with the rest dimmed. */
  highlightRoadIds?: string[];
}) {
  const highlighted = new Set(highlightRoadIds ?? []);
  const shapes = useMemo(
    () =>
      roads.map((road) => {
        const tone =
          road.accessibilityStatus === "accessible"
            ? RISK_TONE[road.riskLevel as RiskLevel]
            : ACCESS_TONE[road.accessibilityStatus as AccessibilityStatus];

        const positions: [number, number][] = road.geometry
          ? road.geometry.coordinates
              .filter(
                (c) =>
                  c.length >= 2 &&
                  Number.isFinite(c[0]) &&
                  Number.isFinite(c[1]),
              )
              // GeoJSON stores [lng, lat]; Leaflet wants [lat, lng].
              .map((c) => [c[1], c[0]] as [number, number])
          : [
              [road.startLatitude, road.startLongitude],
              [road.endLatitude, road.endLongitude],
            ];

        return { road, tone, positions };
      }),
    [roads],
  );

  /** Base stroke width before emphasis, by how much the road matters. */
  const baseWeight = (road: MapRoad) =>
    road.accessibilityStatus === "blocked"
      ? 4.5
      : road.accessibilityStatus === "restricted"
        ? 3.5
        : 3;

  const dashFor = (road: MapRoad) =>
    road.accessibilityStatus === "blocked"
      ? "10 8"
      : road.accessibilityStatus === "restricted"
        ? "16 7"
        : undefined;

  const dimmed = (roadId: string) =>
    highlighted.size > 0 && !highlighted.has(roadId);

  return (
    <>
      {/*
        Pass 1 — glow. Only under selected-route segments, so the chosen
        corridor separates from the network without adding noise elsewhere.
      */}
      {shapes.map(({ road, tone, positions }) =>
        positions.length >= 2 && highlighted.has(road._id) ? (
          <Polyline
            key={`glow-${road._id}`}
            positions={positions}
            interactive={false}
            pathOptions={{
              color: tone.hex,
              weight: baseWeight(road) + 12,
              opacity: 0.18,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ) : null,
      )}

      {/*
        Pass 2 — casing. A dark stroke beneath every line, the standard
        cartographic trick for making coloured routes legible over a busy
        basemap. Drawn as its own pass so no road's line is cut by a
        neighbour's casing, and it carries the same dash so gaps stay open.
      */}
      {shapes.map(({ road, positions }) =>
        positions.length >= 2 ? (
          <Polyline
            key={`case-${road._id}`}
            positions={positions}
            interactive={false}
            pathOptions={{
              color: "#04080b",
              weight: baseWeight(road) + (highlighted.has(road._id) ? 6 : 3.5),
              opacity: dimmed(road._id) ? 0.25 : 0.9,
              dashArray: dashFor(road),
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ) : null,
      )}

      {/* Pass 3 — the coloured line itself, and the only interactive one. */}
      {shapes.map(({ road, tone, positions }) => {
        if (positions.length < 2) return null;

        return (
          <Polyline
            key={road._id}
            positions={positions}
            className={
              road.accessibilityStatus === "blocked" ? "road-blocked" : undefined
            }
            pathOptions={{
              color: tone.hex,
              weight: highlighted.has(road._id)
                ? baseWeight(road) + 3
                : baseWeight(road),
              opacity: dimmed(road._id) ? 0.3 : 1,
              dashArray: dashFor(road),
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Popup>
              <MapPopup
                eyebrow={road.roadNumber}
                title={road.roadName}
                toneHex={tone.hex}
                toneLabel={tone.label}
                rows={[
                  ["District", `${road.district}, ${road.state}`],
                  ["Accessibility", humanize(road.accessibilityStatus)],
                  ["Risk score", `${Math.round(road.riskScore)}/100`],
                  ["Risk level", humanize(road.riskLevel)],
                  ...(road.lengthKm
                    ? ([["Length", `${Math.round(road.lengthKm)} km`]] as Array<
                        [string, string]
                      >)
                    : []),
                  ["Updated", timeAgo(road.lastUpdated)],
                ]}
              />
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

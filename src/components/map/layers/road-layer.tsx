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

  return (
    <>
      {shapes.map(({ road, tone, positions }) => {
        if (positions.length < 2) return null;

        return (
          <Polyline
            key={road._id}
            positions={positions}
            pathOptions={{
              color: tone.hex,
              weight: highlighted.has(road._id)
                ? 7
                : road.accessibilityStatus === "blocked"
                  ? 5
                  : 3,
              opacity:
                highlighted.size > 0 && !highlighted.has(road._id) ? 0.3 : 0.9,
              dashArray:
                road.accessibilityStatus === "blocked"
                  ? "9 7"
                  : road.accessibilityStatus === "restricted"
                    ? "14 6"
                    : undefined,
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

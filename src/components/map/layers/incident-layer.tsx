"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPopup } from "../map-popup";
import type { MapIncident } from "../types";
import { clusterPoints } from "@/lib/cluster";
import { INCIDENT_LABEL, SEVERITY_TONE, type Severity } from "@/lib/risk";
import { formatDateTime, humanize, timeAgo } from "@/lib/format";

/**
 * Single-letter codes rather than pictograms: at marker size a coded badge
 * stays legible where a six-way icon set turns to mush, and it maps directly
 * onto the legend.
 */
const CODE: Record<string, string> = {
  landslide: "L",
  flood: "F",
  road_damage: "R",
  bridge_damage: "B",
  accident: "A",
  traffic: "T",
  other: "?",
};

/**
 * Confirmed incident layer.
 *
 * Incidents are drawn as filled square badges. AI predictions use dashed
 * circles instead (see `risk-layer`), so a forecast can never be mistaken for
 * something that has actually happened.
 */
export function IncidentLayer({
  incidents,
  zoom,
}: {
  incidents: MapIncident[];
  zoom: number;
}) {
  const clusters = useMemo(
    () => clusterPoints(incidents, zoom),
    [incidents, zoom],
  );

  return (
    <>
      {clusters.map((cluster) => {
        // Represent a cluster by its most severe member.
        const lead = cluster.items[0];
        const tone = SEVERITY_TONE[lead.severity as Severity];
        const count = cluster.items.length;

        const icon = L.divIcon({
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          popupAnchor: [0, -12],
          html: `
            <div style="
              width:22px;height:22px;border-radius:5px;
              display:flex;align-items:center;justify-content:center;
              background:${tone.hex}2e;
              border:1.5px solid ${tone.hex};
              color:${tone.hex};
              font:600 11px/1 ui-monospace,monospace;
              box-shadow:0 0 0 3px ${tone.hex}1a;
            ">${count > 1 ? count : (CODE[lead.incidentType] ?? "?")}</div>`,
        });

        return (
          <Marker key={cluster.key} position={[cluster.lat, cluster.lng]} icon={icon}>
            <Popup>
              {count > 1 ? (
                <div className="max-w-[280px] p-3 font-sans">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {count} confirmed incidents
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {cluster.items.slice(0, 6).map((incident) => {
                      const t = SEVERITY_TONE[incident.severity as Severity];
                      return (
                        <li
                          key={incident._id}
                          className="flex items-start gap-2 text-[11px]"
                        >
                          <span
                            className="mt-1 size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: t.hex }}
                          />
                          <span className="flex-1">
                            {INCIDENT_LABEL[incident.incidentType] ??
                              humanize(incident.incidentType)}{" "}
                            — {incident.locationName}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Zoom in to inspect each incident.
                  </p>
                </div>
              ) : (
                <MapPopup
                  eyebrow={
                    lead.verified ? "Confirmed incident" : "Unverified report"
                  }
                  title={
                    INCIDENT_LABEL[lead.incidentType] ??
                    humanize(lead.incidentType)
                  }
                  toneHex={tone.hex}
                  toneLabel={tone.label}
                  rows={[
                    ["Location", lead.locationName],
                    ["District", `${lead.district}, ${lead.state}`],
                    ["Severity", tone.label],
                    ["Status", humanize(lead.status)],
                    ["Verification", lead.verified ? "Verified" : "Pending"],
                    ["Reported", `${timeAgo(lead.createdAt)}`],
                    ["Timestamp", formatDateTime(lead.createdAt)],
                  ]}
                >
                  <p className="mt-2.5 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {lead.description}
                  </p>
                </MapPopup>
              )}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

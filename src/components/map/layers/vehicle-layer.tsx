"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPopup } from "../map-popup";
import type { MapVehicle } from "../types";
import {
  CARGO_LABEL,
  RISK_TONE,
  VEHICLE_STATUS_TONE,
  VEHICLE_TYPE_LABEL,
  type RiskLevel,
} from "@/lib/risk";
import { formatCoords, humanize, timeAgo } from "@/lib/format";

/**
 * Vehicle layer.
 *
 * The marker carries two independent signals: the ring colour is operational
 * status (active / delayed / emergency / offline) and the outer halo is the
 * risk band of the segment the vehicle is on. A healthy truck on a dangerous
 * road therefore looks different from a stalled truck on a safe one.
 *
 * The inner chevron is rotated to the vehicle's heading, so direction of
 * travel reads without opening a popup.
 */
export function VehicleLayer({ vehicles }: { vehicles: MapVehicle[] }) {
  const markers = useMemo(
    () =>
      vehicles.map((vehicle) => {
        const statusTone =
          VEHICLE_STATUS_TONE[vehicle.status] ?? VEHICLE_STATUS_TONE.idle;
        const riskTone = RISK_TONE[vehicle.riskLevel as RiskLevel];
        const emergency = vehicle.status === "emergency";

        const icon = L.divIcon({
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -13],
          html: `
            <div style="
              width:24px;height:24px;border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              background:${statusTone.hex}24;
              border:${emergency ? 2 : 1.5}px solid ${statusTone.hex};
              box-shadow:0 0 0 3px ${riskTone.hex}26;
            ">
              <div style="
                width:0;height:0;
                border-left:4px solid transparent;
                border-right:4px solid transparent;
                border-bottom:9px solid ${statusTone.hex};
                transform:rotate(${Number.isFinite(vehicle.heading) ? vehicle.heading : 0}deg);
              "></div>
            </div>`,
        });

        return { vehicle, icon, statusTone, riskTone };
      }),
    [vehicles],
  );

  return (
    <>
      {markers.map(({ vehicle, icon, statusTone, riskTone }) => (
        <Marker
          key={vehicle._id}
          position={[vehicle.latitude, vehicle.longitude]}
          icon={icon}
        >
          <Popup>
            <MapPopup
              eyebrow={
                VEHICLE_TYPE_LABEL[vehicle.vehicleType] ??
                humanize(vehicle.vehicleType)
              }
              title={vehicle.vehicleNumber}
              toneHex={statusTone.hex}
              toneLabel={statusTone.label}
              rows={[
                [
                  "Cargo",
                  CARGO_LABEL[vehicle.cargoType] ?? humanize(vehicle.cargoType),
                ],
                ["Status", statusTone.label],
                ["Speed", `${Math.round(vehicle.speed)} km/h`],
                ["Destination", vehicle.destination],
                ["Route risk", riskTone.label],
                ["Driver", vehicle.driverName],
                ["Position", formatCoords(vehicle.latitude, vehicle.longitude)],
                ["Updated", timeAgo(vehicle.lastUpdated)],
              ]}
            />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

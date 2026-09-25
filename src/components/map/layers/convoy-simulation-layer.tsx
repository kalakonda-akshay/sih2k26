"use client";

import { useMemo, useEffect, useRef } from "react";
import { Polyline, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Truck, AlertTriangle, ShieldCheck, Navigation } from "lucide-react";

import {
  type ConvoyDefinition,
  type ConvoyWaypoint,
  SIMULATED_CONVOYS,
  getDistanceMeters,
  interpolateConvoyPosition,
} from "../convoy-types";

export {
  type ConvoyDefinition,
  type ConvoyWaypoint,
  SIMULATED_CONVOYS,
  getDistanceMeters,
  interpolateConvoyPosition,
};


export function ConvoySimulationLayer({
  convoy,
  progress,
  isDiverted,
  onGeoFenceBreach,
  followVehicle = false,
}: {
  convoy: ConvoyDefinition;
  progress: number;
  isDiverted: boolean;
  onGeoFenceBreach?: (breached: boolean, distanceKm: number) => void;
  followVehicle?: boolean;
}) {
  const map = useMap();
  const lastBreachRef = useRef(false);

  // Active path depending on whether operator engaged diversion
  const activeWaypoints = useMemo(() => {
    if (isDiverted && convoy.alternatePath) {
      // Connect first half of primary with alternate
      return convoy.alternatePath;
    }
    return convoy.primaryPath;
  }, [convoy, isDiverted]);

  const pos = useMemo(
    () => interpolateConvoyPosition(activeWaypoints, progress),
    [activeWaypoints, progress],
  );

  // Geo-fence distance to hazard zone
  const distToHazardMeters = useMemo(
    () =>
      getDistanceMeters(
        pos.lat,
        pos.lng,
        convoy.hazardZone.lat,
        convoy.hazardZone.lng,
      ),
    [pos.lat, pos.lng, convoy.hazardZone],
  );

  const isBreached = distToHazardMeters <= convoy.hazardZone.radiusMeters;
  const distKm = Math.round(distToHazardMeters / 1000);

  useEffect(() => {
    if (lastBreachRef.current !== isBreached) {
      lastBreachRef.current = isBreached;
      onGeoFenceBreach?.(isBreached, distKm);
    }
  }, [isBreached, distKm, onGeoFenceBreach]);

  // Optionally follow camera
  useEffect(() => {
    if (followVehicle && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) {
      map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.4 });
    }
  }, [followVehicle, pos.lat, pos.lng, map]);

  // Custom high-tech pulsating truck icon
  const convoyIcon = useMemo(() => {
    const alertPulse = isBreached
      ? `<div style="
          position:absolute;inset:-14px;border-radius:50%;
          border:2px solid #ef4444;
          box-shadow:0 0 16px #ef4444;
          animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;
        "></div>`
      : `<div style="
          position:absolute;inset:-6px;border-radius:50%;
          border:1.5px solid #10b981;
          box-shadow:0 0 10px rgba(16,185,129,0.5);
        "></div>`;

    const statusBg = isBreached ? "#ef4444" : "#10b981";

    return L.divIcon({
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
      html: `
        <div style="position:relative;width:36px;height:36px;">
          ${alertPulse}
          <div style="
            position:relative;z-index:10;
            width:36px;height:36px;border-radius:50%;
            background:#0f172a;
            border:2px solid ${statusBg};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 14px rgba(0,0,0,0.6);
          ">
            <div style="
              width:0;height:0;
              border-left:5px solid transparent;
              border-right:5px solid transparent;
              border-bottom:12px solid ${statusBg};
              transform:rotate(${pos.heading}deg);
            "></div>
          </div>
        </div>
      `,
    });
  }, [isBreached, pos.heading]);

  const primaryCoords = useMemo(
    () => convoy.primaryPath.map((w) => [w.lat, w.lng] as [number, number]),
    [convoy.primaryPath],
  );

  const alternateCoords = useMemo(
    () =>
      convoy.alternatePath
        ? convoy.alternatePath.map((w) => [w.lat, w.lng] as [number, number])
        : [],
    [convoy.alternatePath],
  );

  return (
    <>
      {/* Hazard Geo-Fence Circle */}
      <Circle
        center={[convoy.hazardZone.lat, convoy.hazardZone.lng]}
        radius={convoy.hazardZone.radiusMeters}
        pathOptions={{
          color: isBreached ? "#ef4444" : "#f59e0b",
          fillColor: isBreached ? "#ef4444" : "#f59e0b",
          fillOpacity: isBreached ? 0.25 : 0.12,
          weight: 2,
          dashArray: "6, 6",
        }}
      >
        <Popup>
          <div className="p-1 space-y-1 font-sans text-xs">
            <div className="font-bold text-destructive flex items-center gap-1">
              <AlertTriangle className="size-3.5" />
              Geo-Fence Hazard Zone
            </div>
            <div className="font-medium text-foreground">{convoy.hazardZone.name}</div>
            <div className="text-[11px] text-muted-foreground">{convoy.hazardZone.hazardType}</div>
            <div className="font-mono text-[10px] text-amber-400">
              Radius: {convoy.hazardZone.radiusMeters / 1000} km
            </div>
          </div>
        </Popup>
      </Circle>

      {/* Primary Route Path */}
      <Polyline
        positions={primaryCoords}
        pathOptions={{
          color: isDiverted ? "#64748b" : isBreached ? "#ef4444" : "#3b82f6",
          weight: 4,
          opacity: isDiverted ? 0.4 : 0.85,
          dashArray: isDiverted ? "6, 8" : undefined,
        }}
      />

      {/* Alternate Safe Bypass Path (if available) */}
      {alternateCoords.length > 0 && (
        <Polyline
          positions={alternateCoords}
          pathOptions={{
            color: "#10b981",
            weight: isDiverted ? 5 : 3,
            opacity: isDiverted ? 0.95 : 0.5,
            dashArray: isDiverted ? undefined : "4, 6",
          }}
        />
      )}

      {/* Animated Convoy Vehicle Marker */}
      <Marker position={[pos.lat, pos.lng]} icon={convoyIcon}>
        <Popup>
          <div className="p-2 min-w-56 space-y-2 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Truck className="size-3.5 text-primary" />
                {convoy.name.split("(")[0]}
              </span>
              <Badge
                variant={isBreached ? "destructive" : "default"}
                className="font-mono text-[9px] uppercase tracking-wide"
              >
                {isBreached ? "Hazard Alert" : "In Transit"}
              </Badge>
            </div>

            <div className="space-y-1 text-[11px]">
              <div>
                <span className="text-muted-foreground">Cargo: </span>
                <span className="font-medium">{convoy.cargo}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Elevation: </span>
                <span className="font-mono font-medium">{pos.elevation} m</span>
              </div>
              <div>
                <span className="text-muted-foreground">Current Sector: </span>
                <span className="font-medium">{pos.currentWaypoint}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hazard Proximity: </span>
                <span
                  className={`font-mono font-bold ${
                    isBreached ? "text-destructive" : "text-emerald-400"
                  }`}
                >
                  {distKm} km {isBreached ? "(BREACHED)" : "(Safe)"}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

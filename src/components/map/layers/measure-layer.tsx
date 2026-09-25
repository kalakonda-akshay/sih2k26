"use client";

import { useEffect, useState } from "react";
import { Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { RotateCcw, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Waypoint {
  lat: number;
  lng: number;
  cumulativeKm: number;
}

export function MeasureLayer({
  active,
  onClose,
}: {
  active: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const map = useMap();
  const [points, setPoints] = useState<Waypoint[]>([]);

  // Update container cursor when active
  useEffect(() => {
    const container = map.getContainer();
    if (active) {
      container.classList.add("cursor-crosshair");
    } else {
      container.classList.remove("cursor-crosshair");
      setPoints([]);
    }
    return () => {
      container.classList.remove("cursor-crosshair");
    };
  }, [active, map]);

  useMapEvents({
    click: (e) => {
      if (!active) return;
      setPoints((prev) => {
        let addedKm = 0;
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const distMeters = map.distance(
            [last.lat, last.lng],
            [e.latlng.lat, e.latlng.lng],
          );
          addedKm = distMeters / 1000;
        }
        const totalKm = (prev.length > 0 ? prev[prev.length - 1].cumulativeKm : 0) + addedKm;
        return [
          ...prev,
          {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            cumulativeKm: totalKm,
          },
        ];
      });
    },
  });

  if (!active) return null;

  const totalKm = points.length > 0 ? points[points.length - 1].cumulativeKm : 0;
  // In hilly Northeast corridors, commercial trucks average ~35 km/h
  const travelHours = totalKm / 35;
  const hours = Math.floor(travelHours);
  const minutes = Math.round((travelHours - hours) * 60);

  const polylineCoords = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <>
      {polylineCoords.length > 1 && (
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: "#38bdf8",
            weight: 3.5,
            dashArray: "6, 8",
            opacity: 0.9,
          }}
        />
      )}

      {points.map((pt, i) => {
        const isStart = i === 0;
        const isEnd = i === points.length - 1;
        const icon = L.divIcon({
          className: "",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          html: `
            <div style="
              width:20px;height:20px;border-radius:50%;
              background:${isStart ? "#22c55e" : isEnd ? "#ef4444" : "#38bdf8"};
              border:2px solid white;
              box-shadow:0 0 10px rgba(0,0,0,0.6);
              display:flex;align-items:center;justify-content:center;
              color:white;font:bold 10px sans-serif;
            ">${i + 1}</div>`,
        });

        return (
          <Marker key={`${pt.lat}-${pt.lng}-${i}`} position={[pt.lat, pt.lng]} icon={icon}>
            <Tooltip permanent direction="top" offset={[0, -10]} className="tactical-tooltip">
              <span className="font-mono text-[10px] font-semibold">
                {pt.cumulativeKm === 0 ? t("map.measure_start", "Start (0 km)") : `${pt.cumulativeKm.toFixed(2)} km`}
              </span>
            </Tooltip>
          </Marker>
        );
      })}

      {/* Floating Measurement HUD card */}
      <div className="leaflet-top leaflet-left pointer-events-auto" style={{ top: "12px", left: "60px", zIndex: 1000 }}>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("map.measure_distance", "Distance Measurement")}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title={t("common.close", "Close")}
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 py-1 font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">
                {t("map.total_distance", "Total Distance")}
              </div>
              <div className="text-base font-bold text-sky-400">
                {totalKm.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">km</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">
                {t("map.est_time", "Est. Mountain Travel")}
              </div>
              <div className="text-base font-bold text-foreground">
                {hours > 0 ? `${hours}h ` : ""}{minutes}m
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            {points.length === 0
              ? t("map.measure_instructions", "Click anywhere on the map to place route waypoints.")
              : t("map.waypoints_count", { count: points.length, defaultValue: `${points.length} waypoints plotted` })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={points.length === 0}
              onClick={() => setPoints((prev) => prev.slice(0, -1))}
              className={cn(
                "flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
              )}
            >
              <RotateCcw className="size-3" />
              {t("common.undo", "Undo")}
            </button>
            <button
              type="button"
              disabled={points.length === 0}
              onClick={() => setPoints([])}
              className={cn(
                "flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40",
              )}
            >
              <Trash2 className="size-3" />
              {t("common.clear", "Clear")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

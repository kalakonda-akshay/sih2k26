"use client";

import { useMemo, useState } from "react";
import {
  Mountain,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Navigation,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ConvoyDefinition,
  type ConvoyWaypoint,
  getDistanceMeters,
  interpolateConvoyPosition,
} from "./convoy-types";

interface ElevationPoint {
  index: number;
  name: string;
  elevation: number;
  distanceKm: number;
  xPercent: number;
  yPercent: number;
  isHazard?: boolean;
}

interface ConvoyElevationProfileProps {
  selectedConvoy: ConvoyDefinition;
  progress: number;
  isDiverted: boolean;
  onToggleDivert?: () => void;
}

export function ConvoyElevationProfile({
  selectedConvoy,
  progress,
  isDiverted,
  onToggleDivert,
}: ConvoyElevationProfileProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ElevationPoint | null>(null);

  const activePath: ConvoyWaypoint[] = useMemo(() => {
    if (isDiverted && selectedConvoy.alternatePath && selectedConvoy.alternatePath.length > 0) {
      return selectedConvoy.alternatePath;
    }
    return selectedConvoy.primaryPath;
  }, [selectedConvoy, isDiverted]);

  // Current interpolated state
  const currentVehicleState = useMemo(() => {
    return interpolateConvoyPosition(activePath, progress);
  }, [activePath, progress]);

  // Compute profile geometry (Distance vs Elevation)
  const { points, totalDistanceKm, maxElevation, minElevation, pathSvg, areaSvg, currentVehicleX, currentVehicleY, slopePercent } = useMemo(() => {
    let accDist = 0;
    const rawPoints: Array<{ name: string; elevation: number; distanceKm: number }> = [
      { name: activePath[0].name, elevation: activePath[0].elevationMeters, distanceKm: 0 },
    ];

    for (let i = 0; i < activePath.length - 1; i++) {
      const dMeters = getDistanceMeters(
        activePath[i].lat,
        activePath[i].lng,
        activePath[i + 1].lat,
        activePath[i + 1].lng,
      );
      accDist += dMeters / 1000;
      rawPoints.push({
        name: activePath[i + 1].name,
        elevation: activePath[i + 1].elevationMeters,
        distanceKm: accDist,
      });
    }

    const totalDist = accDist || 1;
    let maxElev = 0;
    let minElev = 99999;
    rawPoints.forEach((p) => {
      if (p.elevation > maxElev) maxElev = p.elevation;
      if (p.elevation < minElev) minElev = p.elevation;
    });

    // Provide headroom on Y-axis
    const yMax = Math.max(2000, Math.ceil((maxElev + 400) / 500) * 500);
    const yMin = 0;

    const width = 800;
    const height = 180;
    const padX = 40;
    const padY = 25;
    const plotWidth = width - padX * 2;
    const plotHeight = height - padY * 2;

    const computedPoints: ElevationPoint[] = rawPoints.map((p, idx) => {
      const x = padX + (p.distanceKm / totalDist) * plotWidth;
      const y = height - padY - (p.elevation / yMax) * plotHeight;
      return {
        index: idx,
        name: p.name,
        elevation: p.elevation,
        distanceKm: p.distanceKm,
        xPercent: (x / width) * 100,
        yPercent: (y / height) * 100,
        isHazard: p.name.toLowerCase().includes("hazard") || p.name.toLowerCase().includes("sela") || p.name.toLowerCase().includes("sonapur"),
      };
    });

    // Build SVG Path
    let pathD = `M ${computedPoints[0].xPercent * 8} ${computedPoints[0].yPercent * 1.8}`;
    for (let i = 1; i < computedPoints.length; i++) {
      const prev = computedPoints[i - 1];
      const curr = computedPoints[i];
      // Catmull-Rom or cubic spline for smooth alpine curves
      const cpX1 = prev.xPercent * 8 + (curr.xPercent * 8 - prev.xPercent * 8) * 0.45;
      const cpY1 = prev.yPercent * 1.8;
      const cpX2 = prev.xPercent * 8 + (curr.xPercent * 8 - prev.xPercent * 8) * 0.55;
      const cpY2 = curr.yPercent * 1.8;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.xPercent * 8} ${curr.yPercent * 1.8}`;
    }

    const areaD = `${pathD} L ${computedPoints[computedPoints.length - 1].xPercent * 8} ${height - padY} L ${computedPoints[0].xPercent * 8} ${height - padY} Z`;

    // Calculate vehicle position along plot
    const currDist = progress * totalDist;
    const currX = padX + (currDist / totalDist) * plotWidth;
    const currY = height - padY - (currentVehicleState.elevation / yMax) * plotHeight;

    // Estimate slope gradient percentage (+/-) around current progress
    let slope = 0;
    for (let i = 0; i < rawPoints.length - 1; i++) {
      if (currDist >= rawPoints[i].distanceKm && currDist <= rawPoints[i + 1].distanceKm) {
        const segDistM = (rawPoints[i + 1].distanceKm - rawPoints[i].distanceKm) * 1000;
        const elevDiffM = rawPoints[i + 1].elevation - rawPoints[i].elevation;
        if (segDistM > 0) {
          slope = Math.round((elevDiffM / segDistM) * 1000) / 10;
        }
        break;
      }
    }

    return {
      points: computedPoints,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      maxElevation: maxElev,
      minElevation: minElev === 99999 ? 0 : minElev,
      pathSvg: pathD,
      areaSvg: areaD,
      currentVehicleX: (currX / width) * 100,
      currentVehicleY: (currY / height) * 100,
      slopePercent: slope,
    };
  }, [activePath, progress, currentVehicleState.elevation]);

  // Gear & oxygen advisory based on elevation & slope
  const advisory = useMemo(() => {
    const elev = currentVehicleState.elevation;
    if (elev > 3800) {
      return {
        level: "CRITICAL HIGH-ALTITUDE",
        badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
        gear: "LOW-RANGE 4WD · REDUCED TORQUE",
        oxygen: "58% (Sub-zero freeze risk)",
      };
    }
    if (elev > 2000) {
      return {
        level: "MOUNTAIN PASS RIDGE",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        gear: "GEAR 2/3 (Engine braking essential)",
        oxygen: "78% (Thin mountain air)",
      };
    }
    if (Math.abs(slopePercent) > 7) {
      return {
        level: "HAIRPIN GRADIENT",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        gear: "GEAR 2 · RETARDER ACTIVE",
        oxygen: "92% (Heavy engine stress)",
      };
    }
    return {
      level: "FOOTHILL CORRIDOR",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      gear: "CRUISE 4x2 · OPTIMAL EFFICIENCY",
      oxygen: "98% (Standard air intake)",
    };
  }, [currentVehicleState.elevation, slopePercent]);

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-background/80 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-primary/10 border border-primary/30">
            <Mountain className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground tracking-wide uppercase font-mono">
                3D Mountain Elevation & Hairpin Slope Profile
              </span>
              <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 ${advisory.badgeColor}`}>
                {advisory.level}
              </Badge>
              {isDiverted && (
                <Badge variant="outline" className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                  BYPASS PROFILE
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">
              {selectedConvoy.name} · {activePath[0].name} to {activePath[activePath.length - 1].name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedConvoy.alternatePath && onToggleDivert && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleDivert}
              className={`h-7 text-xs gap-1 font-mono ${
                isDiverted
                  ? "border-cyan-500/50 text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="size-3" />
              {isDiverted ? "Showing Bypass Curve" : "Preview Bypass Curve"}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Telemetry Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Current Altitude</span>
                <Mountain className="size-3 text-primary" />
              </div>
              <div className="text-base font-bold text-foreground mt-0.5">
                {currentVehicleState.elevation.toLocaleString()} <span className="text-[11px] font-normal text-muted-foreground">m</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                Peak: {maxElevation.toLocaleString()}m
              </div>
            </div>

            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Incline / Slope</span>
                {slopePercent >= 0 ? (
                  <ArrowUpRight className="size-3 text-amber-400" />
                ) : (
                  <ArrowDownRight className="size-3 text-cyan-400" />
                )}
              </div>
              <div className={`text-base font-bold mt-0.5 ${Math.abs(slopePercent) > 7 ? "text-amber-400" : "text-foreground"}`}>
                {slopePercent > 0 ? `+${slopePercent}%` : `${slopePercent}%`}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {slopePercent > 6 ? "Steep Mountain Climb" : slopePercent < -6 ? "Steep Descent (Brake Wear)" : "Moderate Incline"}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Gear & Powertrain</span>
                <Gauge className="size-3 text-primary" />
              </div>
              <div className="text-xs font-bold text-foreground mt-1 truncate">
                {advisory.gear}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                All-Terrain Transaxle
              </div>
            </div>

            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Oxygen & Intake</span>
                <Activity className="size-3 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-foreground mt-1 truncate">
                {advisory.oxygen}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                Turbocharged Common-Rail
              </div>
            </div>
          </div>

          {/* SVG Elevation Profile Chart */}
          <div className="relative w-full h-44 bg-background/90 rounded-lg border border-border/70 p-2 overflow-hidden select-none">
            {/* Grid altitude lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-25">
              <div className="border-b border-dashed border-border w-full flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>{Math.max(2000, Math.ceil((maxElevation + 400) / 500) * 500)}m</span>
                <span>ALPINE SNOWLINE</span>
              </div>
              <div className="border-b border-dashed border-border w-full flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>{Math.round(Math.max(2000, Math.ceil((maxElevation + 400) / 500) * 500) * 0.66)}m</span>
                <span>SUB-ALPINE RIDGE</span>
              </div>
              <div className="border-b border-dashed border-border w-full flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>{Math.round(Math.max(2000, Math.ceil((maxElevation + 400) / 500) * 500) * 0.33)}m</span>
                <span>VALLEY BASIN</span>
              </div>
              <div className="border-b border-solid border-border/80 w-full flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>0m</span>
                <span>SEA LEVEL</span>
              </div>
            </div>

            {/* SVG Plot */}
            <svg
              viewBox="0 0 800 180"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full p-2 overflow-visible"
            >
              <defs>
                <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.75 0.16 155)" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="oklch(0.65 0.14 185)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="oklch(0.2 0.05 185)" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="hazardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Area under curve */}
              <path d={areaSvg} fill="url(#elevationGrad)" />

              {/* Line path */}
              <path
                d={pathSvg}
                fill="none"
                stroke="oklch(0.78 0.18 155)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Waypoint milestone pins */}
              {points.map((pt) => (
                <g key={pt.index} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                  <circle
                    cx={pt.xPercent * 8}
                    cy={pt.yPercent * 1.8}
                    r={pt.isHazard ? "4.5" : "3"}
                    fill={pt.isHazard ? "#ef4444" : "oklch(0.85 0.15 88)"}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                  {pt.isHazard && (
                    <circle
                      cx={pt.xPercent * 8}
                      cy={pt.yPercent * 1.8}
                      r="9"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      className="animate-spin"
                    />
                  )}
                </g>
              ))}

              {/* Real-time Convoy Vehicle Pin */}
              <g transform={`translate(${currentVehicleX * 8}, ${currentVehicleY * 1.8})`}>
                {/* Ping rings */}
                <circle r="12" fill="none" stroke="oklch(0.815 0.145 88)" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" values="4;14;4" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle r="5" fill="oklch(0.815 0.145 88)" stroke="#000" strokeWidth="1.5" />
              </g>
            </svg>

            {/* Hover Tooltip or Current Vehicle Status Bubble */}
            <div
              className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-75"
              style={{
                left: `${hoveredPoint ? hoveredPoint.xPercent : currentVehicleX}%`,
                top: `${hoveredPoint ? Math.max(15, hoveredPoint.yPercent - 8) : Math.max(15, currentVehicleY - 8)}%`,
              }}
            >
              <div className="px-2.5 py-1 rounded bg-black/90 border border-primary/50 text-[10px] font-mono shadow-xl text-foreground flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                {hoveredPoint ? (
                  <span>
                    <strong>{hoveredPoint.name}</strong> · {hoveredPoint.elevation.toLocaleString()}m ({Math.round(hoveredPoint.distanceKm)}km)
                  </span>
                ) : (
                  <span>
                    <strong>{currentVehicleState.elevation.toLocaleString()}m</strong> · {currentVehicleState.currentWaypoint}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Waypoint Legend */}
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
            <div className="flex items-center gap-1 truncate max-w-sm">
              <span className="text-foreground font-semibold">Start:</span> {activePath[0].name} ({activePath[0].elevationMeters}m)
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500" /> Hazard Bottleneck
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" /> Active Convoy Position
              </span>
              <span className="text-foreground font-semibold">Total: {totalDistanceKm} km</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

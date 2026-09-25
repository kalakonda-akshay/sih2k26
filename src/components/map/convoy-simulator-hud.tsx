"use client";

import { useState, useEffect, useRef } from "react";
import {
  Truck,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  Navigation,
  Compass,
  Gauge,
  Mountain,
  Eye,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SIMULATED_CONVOYS,
  type ConvoyDefinition,
  interpolateConvoyPosition,
} from "./convoy-types";

/** Synthesize a subtle tactical audio beep using browser Web Audio API at ₹0 cost */
function playTacticalBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Ignore audio permission errors
  }
}

export function ConvoySimulatorHud({
  selectedConvoy,
  onSelectConvoy,
  progress,
  onChangeProgress,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  isDiverted,
  onToggleDivert,
  followVehicle,
  onToggleFollow,
  geoFenceBreached,
  distToHazardKm,
  showElevationProfile,
  onToggleElevationProfile,
}: {
  selectedConvoy: ConvoyDefinition;
  onSelectConvoy: (convoy: ConvoyDefinition) => void;
  progress: number;
  onChangeProgress: (p: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onChangeSpeed: (s: number) => void;
  isDiverted: boolean;
  onToggleDivert: () => void;
  followVehicle: boolean;
  onToggleFollow: () => void;
  geoFenceBreached: boolean;
  distToHazardKm: number;
  showElevationProfile?: boolean;
  onToggleElevationProfile?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastAlertRef = useRef(false);

  // Play tactical alert sound once when geo-fence is breached
  useEffect(() => {
    if (geoFenceBreached && !lastAlertRef.current && soundEnabled) {
      playTacticalBeep();
    }
    lastAlertRef.current = geoFenceBreached;
  }, [geoFenceBreached, soundEnabled]);

  const activeWaypoints = isDiverted && selectedConvoy.alternatePath
    ? selectedConvoy.alternatePath
    : selectedConvoy.primaryPath;

  const currentPos = interpolateConvoyPosition(activeWaypoints, progress);

  if (!isExpanded) {
    return (
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold backdrop-blur-md shadow-xl transition-all hover:bg-card hover:scale-105 ${
            geoFenceBreached
              ? "border-destructive text-destructive shadow-destructive/20 animate-pulse"
              : "text-foreground"
          }`}
        >
          <Truck className="size-4 text-primary" />
          <span>Convoy Simulation</span>
          {isPlaying ? (
            <Badge variant="default" className="font-mono text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
              Active ({Math.round(progress * 100)}%)
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">
              Paused
            </Badge>
          )}

          {geoFenceBreached && (
            <span className="flex size-2 rounded-full bg-destructive animate-ping" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] w-84 sm:w-96 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur-xl shadow-2xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Truck className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold leading-none">
              Tactical Convoy Simulator
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">
              SIH26002 · MDoNER Relief Transit Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground"
            onClick={() => setSoundEnabled((s) => !s)}
            title={soundEnabled ? "Mute Siren" : "Unmute Siren"}
          >
            {soundEnabled ? (
              <Volume2 className="size-3.5 text-primary" />
            ) : (
              <VolumeX className="size-3.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(false)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Convoy Selector Dropdown */}
      <div className="mt-3">
        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
          Select Active Relief Fleet
        </label>
        <select
          value={selectedConvoy.id}
          onChange={(e) => {
            const found = SIMULATED_CONVOYS.find((c) => c.id === e.target.value);
            if (found) {
              onSelectConvoy(found);
              onChangeProgress(0);
            }
          }}
          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SIMULATED_CONVOYS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Geo-Fence Dynamic Alert Banner */}
      {geoFenceBreached ? (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/15 p-2.5 text-xs text-destructive space-y-1.5 animate-pulse">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              Geo-Fence Hazard Breach!
            </span>
            <span className="font-mono text-[10px]">{distToHazardKm} km away</span>
          </div>
          <p className="text-[11px] leading-tight text-foreground/90">
            Convoy entering <strong>{selectedConvoy.hazardZone.name}</strong> ({selectedConvoy.hazardZone.hazardType}).
          </p>
          {selectedConvoy.alternatePath && (
            <Button
              size="sm"
              variant={isDiverted ? "default" : "destructive"}
              className="w-full h-7 text-[11px] font-semibold mt-1"
              onClick={onToggleDivert}
            >
              {isDiverted ? (
                <>
                  <ShieldCheck className="size-3.5 mr-1" />
                  Alternate Bypass Engaged (Haflong Route)
                </>
              ) : (
                <>
                  <Navigation className="size-3.5 mr-1" />
                  Engage Emergency Diversion By-Pass
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-400">
          <span className="flex items-center gap-1.5 font-medium text-[11px]">
            <ShieldCheck className="size-3.5" />
            Corridor Geo-Fence Clean
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            Hazard: {distToHazardKm} km clear
          </span>
        </div>
      )}

      {/* Progress Scrubber */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Transit Progress</span>
          <span className="text-foreground font-semibold">
            {Math.round(progress * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={progress}
          onChange={(e) => onChangeProgress(parseFloat(e.target.value))}
          className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
        />
      </div>

      {/* Live Telemetry Display */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border/50 bg-background/50 p-2">
          <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1">
            <Gauge className="size-3 text-primary" /> Speed
          </div>
          <div className="mt-0.5 font-mono text-xs font-bold text-foreground">
            {isPlaying ? `${Math.round(38 + Math.sin(progress * 20) * 12)} km/h` : "0 km/h"}
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/50 p-2">
          <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1">
            <Mountain className="size-3 text-primary" /> Altitude
          </div>
          <div className="mt-0.5 font-mono text-xs font-bold text-foreground">
            {currentPos.elevation} m
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/50 p-2">
          <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1">
            <Compass className="size-3 text-primary" /> Heading
          </div>
          <div className="mt-0.5 font-mono text-xs font-bold text-foreground">
            {Math.round(currentPos.heading)}°
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-border/40 bg-background/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Sector: </span>
        <span className="font-mono">{currentPos.currentWaypoint}</span>
      </div>

      {/* Controls: Play/Pause, Speed, Camera Follow */}
      <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-border/60 pt-3">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isPlaying ? "destructive" : "default"}
            className="h-8 gap-1 text-xs px-3 font-semibold"
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Start Convoy
              </>
            )}
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => onChangeProgress(0)}
            title="Restart Route"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Speed selector */}
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                  speed === s
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Camera Follow Toggle */}
          <Button
            size="icon"
            variant={followVehicle ? "default" : "outline"}
            className={`size-8 ${followVehicle ? "bg-primary text-primary-foreground" : ""}`}
            onClick={onToggleFollow}
            title={followVehicle ? "Following Convoy Camera" : "Free Camera"}
          >
            <Eye className="size-3.5" />
          </Button>

          {/* Elevation Profile Toggle */}
          {onToggleElevationProfile && (
            <Button
              size="icon"
              variant={showElevationProfile ? "default" : "outline"}
              className={`size-8 ${showElevationProfile ? "bg-primary text-primary-foreground" : ""}`}
              onClick={onToggleElevationProfile}
              title={showElevationProfile ? "Hide 3D Elevation Profile" : "Show 3D Elevation Profile"}
            >
              <Mountain className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

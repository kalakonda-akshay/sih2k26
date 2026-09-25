"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import {
  Siren,
  ShieldAlert,
  Volume2,
  VolumeX,
  X,
  Maximize2,
  Minimize2,
  Radio,
  Truck,
  AlertTriangle,
  FileText,
  Share2,
  Send,
  Activity,
  Layers,
  Clock,
  Compass,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SIMULATED_CONVOYS, type ConvoyDefinition } from "@/components/map/convoy-types";
import { ConvoyElevationProfile } from "@/components/map/convoy-elevation-profile";

// Dynamically import MapCanvas to preserve SSR safety (Leaflet window check)
const MapCanvas = dynamic(
  () => import("@/components/map/map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#070a0f] text-xs font-mono text-muted-foreground">
        INITIALIZING TACTICAL RADAR MESH...
      </div>
    ),
  },
);

/** Synthesizes an emergency defense siren using browser Web Audio API at ₹0 cost */
function playEmergencySirenBurst() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.linearRampToValueAtTime(950, now + 0.35);
    osc.frequency.linearRampToValueAtTime(450, now + 0.7);
    osc.frequency.linearRampToValueAtTime(950, now + 1.05);
    osc.frequency.linearRampToValueAtTime(450, now + 1.4);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 1.5);
  } catch {
    // Ignore audio permission errors
  }
}

/** Subtle tactical radar ping */
function playRadarChirp() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Ignore audio errors
  }
}

export function WarRoomModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [timeString, setTimeString] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeDefcon, setActiveDefcon] = useState(2);
  const [selectedConvoy, setSelectedConvoy] = useState<ConvoyDefinition>(SIMULATED_CONVOYS[0]);
  const [convoyProgress, setConvoyProgress] = useState(0.35);
  const [isDiverted, setIsDiverted] = useState(false);
  const [showElevation, setShowElevation] = useState(false);

  const incidents = useQuery(api.incidents.listIncidents, {});
  const mapData = useQuery(api.map.getIntelligence);

  // Live UTC / IST clock ticker
  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).toUpperCase() +
          " · " +
          now.toLocaleTimeString("en-IN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }) +
          " IST",
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Convoy animation loop inside War-Room
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setConvoyProgress((prev) => (prev >= 1 ? 0.05 : prev + 0.0015));
    }, 50);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Periodic ambient radar chirp if sound enabled
  useEffect(() => {
    if (!isOpen || !soundEnabled) return;
    const chirpInterval = setInterval(() => {
      playRadarChirp();
    }, 12000);
    return () => clearInterval(chirpInterval);
  }, [isOpen, soundEnabled]);

  // ESC key listener to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#06090e] text-foreground select-none overflow-hidden animate-in fade-in duration-200">
      {/* ── TOP WAR-ROOM COMMAND BAR ────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-red-500/30 bg-[#0a0f18] px-4">
        {/* Left: Joint Ops Identity */}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md border border-red-500/50 bg-red-950/40 text-red-400">
            <Radio className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black tracking-widest text-red-400 uppercase">
                JEOC · MDoNER WAR-ROOM COMMAND
              </span>
              <span className="rounded bg-red-500/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-red-300 border border-red-500/40">
                LIVE OPS
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              North East Region Strategic Disaster Logistics Center · 8 States Active
            </div>
          </div>
        </div>

        {/* Center: Threat Condition (DEFCON) */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-border/70 bg-black/60 px-3 py-1 text-xs font-mono">
          <span className="text-muted-foreground uppercase text-[10px]">Defense Condition:</span>
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                setActiveDefcon(level);
                if (level === 1 && soundEnabled) playEmergencySirenBurst();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                activeDefcon === level
                  ? level === 1
                    ? "bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse"
                    : level === 2
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-500/30"
                      : "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              DEFCON {level}
            </button>
          ))}
        </div>

        {/* Right: Clock & Exit Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-muted-foreground border-r border-border/60 pr-3">
            <Clock className="size-3.5 text-primary" />
            <span className="text-foreground font-semibold">{timeString || "SYNCHRONIZING..."}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSoundEnabled((s) => !s)}
            className="h-8 text-xs font-mono text-muted-foreground hover:text-foreground"
            title={soundEnabled ? "Mute Tactical Audio" : "Enable Tactical Audio"}
          >
            {soundEnabled ? <Volume2 className="size-4 text-emerald-400" /> : <VolumeX className="size-4" />}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => playEmergencySirenBurst()}
            className="h-8 gap-1.5 text-xs font-mono border-red-500/50 bg-red-950/30 text-red-300 hover:bg-red-900/50"
          >
            <Siren className="size-3.5" /> Siren Test
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onClose}
            className="h-8 gap-1 text-xs font-mono font-semibold"
          >
            <X className="size-4" /> Exit War-Room (ESC)
          </Button>
        </div>
      </header>

      {/* ── WAR-ROOM BODY: SPLIT 68% MAP / 32% TACTICAL STREAM ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT (68%): Full Tactical GIS Radar Canvas */}
        <div className="relative flex-1 min-w-0 border-r border-border/60 bg-[#070b12] flex flex-col">
          {/* Convoy Selector Strip */}
          <div className="flex items-center justify-between border-b border-border/60 bg-[#0c121d] px-4 py-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase text-[10px]">Active Convoy:</span>
              <div className="flex gap-1">
                {SIMULATED_CONVOYS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedConvoy(c);
                      setConvoyProgress(0.15);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      selectedConvoy.id === c.id
                        ? "bg-primary text-primary-foreground font-bold shadow-md"
                        : "bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.id.replace("convoy-", "").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDiverted((d) => !d)}
                className={`h-6 text-[10px] font-mono gap-1 ${
                  isDiverted
                    ? "border-cyan-500 text-cyan-300 bg-cyan-950/40"
                    : "border-border text-muted-foreground"
                }`}
              >
                {isDiverted ? "Bypass Active" : "Normal Path"}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowElevation((e) => !e)}
                className="h-6 text-[10px] font-mono text-muted-foreground hover:text-foreground"
              >
                {showElevation ? "Hide Alt Profile" : "Show Alt Profile"}
              </Button>
            </div>
          </div>

          {/* Map Surface */}
          <div className="relative flex-1 w-full min-h-0">
            {mapData && (
              <MapCanvas
                data={mapData}
                layers={{ roads: true, incidents: true, vehicles: true, weather: true, risk: true, radar: true }}
                focus={null}
                basemap="satellite"
                measureMode={false}
                onCloseMeasure={() => {}}
                simulatingConvoy={true}
                convoy={selectedConvoy}
                convoyProgress={convoyProgress}
                convoyDiverted={isDiverted}
                onGeoFenceBreach={(breached: boolean) => {
                  if (breached && soundEnabled) playEmergencySirenBurst();
                }}
              />
            )}

            {/* Docked Elevation Profile inside War Room */}
            {showElevation && (
              <div className="absolute bottom-4 left-4 right-4 z-20 max-w-3xl mx-auto pointer-events-auto">
                <ConvoyElevationProfile
                  selectedConvoy={selectedConvoy}
                  progress={convoyProgress}
                  isDiverted={isDiverted}
                  onToggleDivert={() => setIsDiverted((d) => !d)}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (32%): Tactical Operations Console */}
        <div className="w-[380px] shrink-0 bg-[#090e17] flex flex-col min-h-0 border-l border-border/80">
          {/* Tactical Telemetry Strip */}
          <div className="grid grid-cols-2 gap-px bg-border/60 border-b border-border/60">
            <div className="bg-[#0b101a] p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                <span>Convoys In Transit</span>
                <Truck className="size-3 text-primary" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-foreground">3 / 3 Active</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">74.5 T Relief En Route</div>
            </div>

            <div className="bg-[#0b101a] p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                <span>Closed Defiles</span>
                <AlertTriangle className="size-3 text-red-400" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-red-400">2 Critical</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">NH-6 & NH-13 Blocked</div>
            </div>
          </div>

          {/* Quick-Action Command Station */}
          <div className="p-3 border-b border-border/60 bg-[#0a0f18] space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Immediate Command Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.location.href = "/emergency";
                }}
                className="h-8 text-xs font-mono border-amber-500/40 text-amber-300 bg-amber-950/20 hover:bg-amber-900/40"
              >
                <Send className="size-3 mr-1" /> Fast2SMS Alert
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.location.href = "/emergency";
                }}
                className="h-8 text-xs font-mono border-cyan-500/40 text-cyan-300 bg-cyan-950/20 hover:bg-cyan-900/40"
              >
                <Share2 className="size-3 mr-1" /> WhatsApp Card
              </Button>
            </div>
          </div>

          {/* Live Incident Stream */}
          <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500 animate-ping" />
                Live Disruption Ticker
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {incidents ? `${incidents.length} Hazards` : "Scanning..."}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {(incidents || []).map((inc) => (
                <div
                  key={inc._id}
                  className="rounded-lg border border-border/70 bg-[#0c121d] p-2.5 text-xs space-y-1 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-foreground">
                      {inc.locationName}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono uppercase px-1.5 py-0 ${
                        inc.severity === "critical"
                          ? "bg-red-500/15 text-red-400 border-red-500/40"
                          : inc.severity === "high"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                            : "bg-blue-500/15 text-blue-400 border-blue-500/40"
                      }`}
                    >
                      {inc.severity}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {inc.district}, {inc.state} · {inc.incidentType.replace(/_/g, " ").toUpperCase()}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 font-mono">
                    GPS: {inc.latitude.toFixed(4)}°N, {inc.longitude.toFixed(4)}°E
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="p-2.5 bg-[#06090e] border-t border-border/60 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Fast2SMS DLT: <strong>ONLINE (200 SMS)</strong></span>
            <span>Mesh: <strong>100% PERSISTENT</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

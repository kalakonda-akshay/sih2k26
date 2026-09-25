"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
  Mountain,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  Users,
  Wifi,
  WifiOff,
  Navigation,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Upload,
  Music,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SIMULATED_CONVOYS,
  FLEET_CONVOYS,
  FLEET_CATEGORIES,
  type ConvoyDefinition,
  type ConvoyFleetItem,
  type FleetCategory,
} from "@/components/map/convoy-types";
import { ConvoyElevationProfile } from "@/components/map/convoy-elevation-profile";
import { DisasterAlertCardGenerator } from "@/components/emergency/disaster-alert-card-generator";
import { SmsAutomationPanel } from "@/components/emergency/sms-automation-panel";
import type { BasemapStyle, FocusTarget } from "@/components/map/types";

// Dynamically import MapCanvas to preserve SSR safety (Leaflet window check)
const MapCanvas = dynamic(
  () => import("@/components/map/map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#070a0f] text-xs font-mono text-muted-foreground">
        INITIALIZING DEFENSE RADAR MESH...
      </div>
    ),
  },
);

/** Synthesizes audio backup if custom or static audio files fail to load */
function playSynthesizedSiren(level: number = 1) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    if (level === 1) {
      // DEFCON 1: Urgent 450Hz - 950Hz defense wail
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.35);
      osc.frequency.linearRampToValueAtTime(450, now + 0.7);
      osc.frequency.linearRampToValueAtTime(950, now + 1.05);
      osc.frequency.linearRampToValueAtTime(450, now + 1.4);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 1.5);
    } else if (level === 2) {
      // DEFCON 2: Elevated 520Hz - 780Hz warning pulses
      osc.type = "square";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(780, now + 0.3);
      osc.frequency.setValueAtTime(520, now + 0.6);
      osc.frequency.setValueAtTime(780, now + 0.9);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 1.25);
    } else {
      // DEFCON 3: Advisory 440Hz / 880Hz chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.8);
    }
  } catch {
    // Ignore audio permission errors
  }
}

/** Plays the audio siren for the specific DEFCON level (prioritizing uploaded audio files) */
function playSirenForDefcon(level: number = 1, customSirens?: Record<number, string>) {
  if (typeof window === "undefined") return;
  try {
    // 1. Check in-memory uploaded siren if operator uploaded custom audio via UI
    if (customSirens && customSirens[level]) {
      const audio = new Audio(customSirens[level]);
      audio.volume = 0.9;
      audio.play().catch(() => playSynthesizedSiren(level));
      return;
    }
    // 2. Play from uploaded static audio files /audio/siren-defcon{1,2,3}.wav or .mp3
    const audioWav = new Audio(`/audio/siren-defcon${level}.wav`);
    audioWav.volume = 0.9;
    audioWav.play().catch(() => {
      const audioMp3 = new Audio(`/audio/siren-defcon${level}.mp3`);
      audioMp3.volume = 0.9;
      audioMp3.play().catch(() => playSynthesizedSiren(level));
    });
  } catch {
    playSynthesizedSiren(level);
  }
}

/** Legacy alias pointing to DEFCON 1 siren */
function playEmergencySirenBurst(level: number = 1) {
  playSirenForDefcon(level);
}

/** Subtle tactical radar ping */
function playRadarChirp() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
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

/** Tactical confirmation sound for engagement */
function playTacticalEngageChirp() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // Ignore audio errors
  }
}

export interface WarRoomIncident {
  id: string;
  title: string;
  roadName: string;
  location: string;
  state: string;
  severity: "critical" | "high" | "medium";
  timeAgo: string;
  lat: number;
  lng: number;
  debrisVolumeM3?: number;
  impactedConvoys: string[];
  aiRecommendation: string;
  bypassRouteName: string;
  bypassDelta: string;
  roadStatus: string;
}

export const WAR_ROOM_CURATED_INCIDENTS: WarRoomIncident[] = [
  {
    id: "inc-tawang-nh13",
    title: "Landslide — NH-13",
    roadName: "NH-13 Sector 4",
    location: "Tawang, Arunachal Pradesh",
    state: "Arunachal Pradesh",
    severity: "critical",
    timeAgo: "2 min ago",
    lat: 27.505,
    lng: 92.103,
    debrisVolumeM3: 450,
    impactedConvoys: ["CV-04", "CV-09"],
    aiRecommendation:
      "Divert via Route B (Sangti Valley Strategic Bypass, +42 km, +1h 15m, 0 hazard points)",
    bypassRouteName: "Route B (Sangti Valley Bypass)",
    bypassDelta: "+42 km · +1h 15m",
    roadStatus: "NH-13 Blocked (Dual-lane rockfall)",
  },
  {
    id: "inc-sonapur-nh6",
    title: "Bridge Risk — NH-6",
    roadName: "NH-6 Sector 9",
    location: "Sonapur Defile, Assam",
    state: "Assam",
    severity: "high",
    timeAgo: "8 min ago",
    lat: 25.18,
    lng: 92.35,
    debrisVolumeM3: 180,
    impactedConvoys: ["CV-01", "CV-39"],
    aiRecommendation:
      "Divert via Umrangso Hydro Pass bypass. Avoid heavy axled trailers on Sonapur bridge.",
    bypassRouteName: "Umrangso Hydro Bypass",
    bypassDelta: "+58 km · +1h 40m",
    roadStatus: "NH-6 Restricted (Pier scour alert)",
  },
  {
    id: "inc-nagaon-nh27",
    title: "Flood Warning — NH-27",
    roadName: "NH-27 East Corridor",
    location: "Nagaon Bypass, Assam",
    state: "Assam",
    severity: "medium",
    timeAgo: "18 min ago",
    lat: 26.35,
    lng: 92.51,
    debrisVolumeM3: 0,
    impactedConvoys: ["CV-14", "CV-25"],
    aiRecommendation:
      "Restrict speed to 30 km/h; convoy escort mandatory. Slips roads inundated +1.2m.",
    bypassRouteName: "Elevated Flyover Carriageway",
    bypassDelta: "+0 km · Escort Active",
    roadStatus: "NH-27 Restricted (Waterlogging)",
  },
];

export function WarRoomView({
  onExit,
  isModal = false,
}: {
  onExit?: () => void;
  isModal?: boolean;
}) {
  const router = useRouter();
  const [timeString, setTimeString] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeDefcon, setActiveDefcon] = useState(2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tactical Basemap
  const [basemap, setBasemap] = useState<BasemapStyle>("satellite");

  // Tactical Convoy Simulation
  const [selectedConvoy, setSelectedConvoy] = useState<ConvoyDefinition>(
    SIMULATED_CONVOYS[1], // Convoy Bravo (Tawang / Bomdila / Sela Pass)
  );
  const [convoyProgress, setConvoyProgress] = useState(0.42);
  const [isDiverted, setIsDiverted] = useState(false);
  const [showElevation, setShowElevation] = useState(true);

  // Tactical Focus Target for Leaflet Map
  const [mapFocus, setMapFocus] = useState<FocusTarget | null>(null);

  // Selected Incident for Incident -> Response (Killer Feature 8)
  const [selectedIncident, setSelectedIncident] = useState<WarRoomIncident | null>(
    WAR_ROOM_CURATED_INCIDENTS[0],
  );
  const [diversionApplied, setDiversionApplied] = useState(false);

  // Left Drawer / Tab: Fleet Intelligence (Point 5)
  const [fleetOpen, setFleetOpen] = useState(false);
  const [fleetFilter, setFleetFilter] = useState<FleetCategory | "all">("all");

  // Emergency Broadcast Confirmation Modal (Point 6)
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastActionType, setBroadcastActionType] = useState<
    "alert" | "divert" | "card" | "team"
  >("alert");
  const [emergencyCardModalOpen, setEmergencyCardModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [sirenUploadModalOpen, setSirenUploadModalOpen] = useState(false);
  const [customSirens, setCustomSirens] = useState<Record<number, string>>({});

  // Database Queries
  const liveIncidents = useQuery(api.incidents.listIncidents, {});
  const mapData = useQuery(api.map.getIntelligence);

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now
          .toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .toUpperCase() +
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
  }, []);

  // Convoy Animation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setConvoyProgress((prev) => (prev >= 0.98 ? 0.05 : prev + 0.0012));
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Ambient Radar Chirp
  useEffect(() => {
    if (!soundEnabled) return;
    const interval = setInterval(() => {
      playRadarChirp();
    }, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcuts (ESC to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (broadcastModalOpen) setBroadcastModalOpen(false);
        else if (emergencyCardModalOpen) setEmergencyCardModalOpen(false);
        else if (smsModalOpen) setSmsModalOpen(false);
        else if (fleetOpen) setFleetOpen(false);
        else if (onExit) onExit();
        else router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [broadcastModalOpen, emergencyCardModalOpen, smsModalOpen, fleetOpen, onExit, router]);

  // Handle incident click (Point 3 & Point 8)
  const handleSelectIncident = (inc: WarRoomIncident) => {
    setSelectedIncident(inc);
    setMapFocus({
      lat: inc.lat,
      lng: inc.lng,
      zoom: 11,
      key: Date.now(),
    });
    if (soundEnabled) playRadarChirp();
  };

  // Filtered Convoys
  const filteredConvoys = useMemo(() => {
    if (fleetFilter === "all") return FLEET_CONVOYS;
    return FLEET_CONVOYS.filter((c) => c.category === fleetFilter);
  }, [fleetFilter]);

  // Handle Engage Emergency Diversion (Point 8)
  const handleEngageDiversion = () => {
    setIsDiverted(true);
    setDiversionApplied(true);
    if (soundEnabled) {
      playTacticalEngageChirp();
    }
  };

  // Handle Emergency Action dock click
  const handleActionClick = (type: "alert" | "divert" | "card" | "team") => {
    setBroadcastActionType(type);
    setBroadcastModalOpen(true);
    if (soundEnabled) playRadarChirp();
  };

  // Confirm Emergency Broadcast execution
  const handleConfirmBroadcast = () => {
    setBroadcastModalOpen(false);
    if (soundEnabled) playEmergencySirenBurst();

    if (broadcastActionType === "alert") {
      setSmsModalOpen(true);
    } else if (broadcastActionType === "card") {
      setEmergencyCardModalOpen(true);
    } else if (broadcastActionType === "divert") {
      handleEngageDiversion();
    } else if (broadcastActionType === "team") {
      alert("NDRF Quick Response Team 4 dispatched from Tezpur BRO Base to NH-13 Sector.");
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#06090f] text-foreground select-none">
      {/* ═════════════════════════════════════════════════════════════════════
          1. TOP: COMMAND STATUS BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-red-500/30 bg-[#080d16] px-3 md:px-5 z-20">
        {/* Left: Identity & Operational Status */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-red-500/60 bg-red-950/40 text-red-400">
            <Radio className="size-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs md:text-sm font-black tracking-wider text-red-400 uppercase whitespace-nowrap">
                NER-VISION AI | WAR-ROOM
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                SYSTEM OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground truncate hidden 2xl:block">
              MDoNER Joint Emergency Operations Center (JEOC) · 8 North East States Active
            </div>
          </div>
        </div>

        {/* Center: Live Telemetry Badges (Active Incidents: 27, Active Convoys: 42, Critical Alerts: 04, Field Teams: 12) */}
        <div className="hidden xl:flex items-center gap-2 font-mono text-xs shrink-0 whitespace-nowrap">
          <div className="flex items-center gap-1.5 rounded border border-red-500/40 bg-red-950/30 px-2.5 py-1 text-red-300">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span>Active Incidents:</span>
            <strong className="font-bold text-foreground">27</strong>
          </div>

          <div
            onClick={() => setFleetOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-1 text-cyan-300 cursor-pointer hover:bg-cyan-900/40 transition-colors"
            title="Click to open Fleet Intelligence"
          >
            <Truck className="size-3 text-cyan-400" />
            <span>Active Convoys:</span>
            <strong className="font-bold text-foreground">42</strong>
          </div>

          <div className="flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-amber-300">
            <AlertTriangle className="size-3 text-amber-400" />
            <span>Critical Alerts:</span>
            <strong className="font-bold text-foreground">04</strong>
          </div>

          <div className="flex items-center gap-1.5 rounded border border-blue-500/40 bg-blue-950/30 px-2.5 py-1 text-blue-300">
            <Users className="size-3 text-blue-400" />
            <span>Field Teams:</span>
            <strong className="font-bold text-foreground">12</strong>
          </div>

          <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1 text-emerald-300">
            <span>Cargo:</span>
            <strong className="font-bold text-foreground">628 MT</strong>
          </div>
        </div>

        {/* Right: DEFCON, Clock & Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* DEFCON Selector for all 3 levels */}
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-black/50 p-0.5 font-mono text-[10px]">
            <span className="px-1 text-[9px] text-muted-foreground uppercase font-semibold hidden md:inline">LEVEL:</span>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setActiveDefcon(lvl);
                  if (soundEnabled) playSirenForDefcon(lvl, customSirens);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all whitespace-nowrap ${
                  activeDefcon === lvl
                    ? lvl === 1
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/50 animate-pulse"
                      : lvl === 2
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/40"
                        : "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Switch to DEFCON ${lvl} and play siren`}
              >
                DEFCON {lvl}
              </button>
            ))}
          </div>

          {/* Real-time UTC/IST Clock */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-muted-foreground border-l border-border/60 pl-3">
            <Clock className="size-3.5 text-primary" />
            <span className="text-foreground font-semibold whitespace-nowrap">{timeString || "00:00:00 IST"}</span>
          </div>

          {/* Audio Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSoundEnabled((s) => !s)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title={soundEnabled ? "Mute Radar & Sirens" : "Enable Radar & Sirens"}
          >
            {soundEnabled ? (
              <Volume2 className="size-4 text-emerald-400" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )}
          </Button>

          {/* Siren Trigger & Upload Manager */}
          <div className="flex items-center rounded-md border border-red-500/50 bg-red-950/20 overflow-hidden hidden sm:flex">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => playSirenForDefcon(activeDefcon, customSirens)}
              className="h-8 gap-1.5 px-2.5 text-red-300 hover:bg-red-900/40 hover:text-red-200 font-mono text-xs rounded-none border-0"
              title={`Play Siren for Active DEFCON ${activeDefcon}`}
            >
              <Siren className="size-3.5 text-red-400 animate-pulse" />
              <span>Siren (L{activeDefcon})</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSirenUploadModalOpen(true)}
              className="h-8 px-2 text-red-400 hover:bg-red-900/40 hover:text-red-200 rounded-none border-l border-red-500/30"
              title="Manage & Upload 3-Level Sirens"
            >
              <SlidersHorizontal className="size-3" />
            </Button>
          </div>

          {/* Fullscreen Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleFullscreen}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hidden sm:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          {/* Exit War-Room */}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (onExit) onExit();
              else router.push("/dashboard");
            }}
            className="h-8 gap-1 font-mono text-xs font-semibold whitespace-nowrap"
          >
            <X className="size-4" /> Exit (ESC)
          </Button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════
          MAIN WAR-ROOM VIEWPORT (SPLIT 68% MAP / 32% LIVE INCIDENTS & CONSOLE)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* ──────────────────────────────────────────────────────────────────
            2. CENTER: MAIN LIVE MAP (65–70% SCREEN)
        ────────────────────────────────────────────────────────────────── */}
        <div className="relative flex-1 min-w-0 bg-[#070b12] flex flex-col">
          {/* Tactical Map Ribbon */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/70 bg-[#090f19] px-3 text-xs font-mono z-10 overflow-x-auto no-scrollbar">
            {/* Left: Road State Legend + Convoy Selector */}
            <div className="flex items-center gap-3">
              {/* Road Status Indicators (🟢 Safe, 🟡 Restricted, 🔴 Blocked) */}
              <div className="flex items-center gap-2 border-r border-border/60 pr-3">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <span className="size-2 rounded-full bg-emerald-500" /> Safe Roads
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                  <span className="size-2 rounded-full bg-amber-500" /> Restricted
                </span>
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                  <span className="size-2 rounded-full bg-red-500 animate-pulse" /> Blocked
                </span>
              </div>

              {/* Active Simulated Convoy Switcher */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase">Convoy:</span>
                {SIMULATED_CONVOYS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedConvoy(c);
                      setConvoyProgress(0.2);
                      setIsDiverted(false);
                      setDiversionApplied(false);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      selectedConvoy.id === c.id
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.id.replace("convoy-", "").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Basemap Selector + Elevation Toggle + Fleet Drawer Toggle */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFleetOpen((prev) => !prev)}
                className={`h-6 text-[10px] font-mono gap-1 ${
                  fleetOpen
                    ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Truck className="size-3" /> Fleet ({FLEET_CONVOYS.length})
              </Button>

              <div className="hidden sm:flex items-center gap-1 rounded border border-border/70 bg-black/40 p-0.5">
                {(["satellite", "dark", "topo"] as BasemapStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setBasemap(style)}
                    className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-mono ${
                      basemap === style
                        ? "bg-white/20 text-white font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowElevation((prev) => !prev)}
                className="h-6 text-[10px] font-mono text-muted-foreground hover:text-foreground"
              >
                <Mountain className="size-3 mr-1" />
                {showElevation ? "Hide 3D Alt" : "Show 3D Alt"}
              </Button>
            </div>
          </div>

          {/* Tactical Leaflet Canvas Container */}
          <div className="relative flex-1 w-full min-h-0">
            {mapData && (
              <MapCanvas
                data={mapData}
                layers={{
                  roads: true,
                  incidents: true,
                  vehicles: true,
                  weather: true,
                  risk: true,
                  radar: true,
                }}
                focus={mapFocus}
                basemap={basemap}
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

            {/* Tactical Compass & Communication Relay Overlay */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1.5 font-mono text-[10px]">
              <div className="rounded border border-border/80 bg-[#080d16]/85 px-2.5 py-1 text-muted-foreground shadow-md backdrop-blur-md">
                <span className="text-cyan-400 font-bold">RADAR SECTOR:</span> EASTERN HIMALAYAS
              </div>
              <div className="rounded border border-border/80 bg-[#080d16]/85 px-2.5 py-1 text-muted-foreground shadow-md backdrop-blur-md flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>VSAT UPLINK: 4 RELAYS ACTIVE</span>
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────
                4. BOTTOM: 3D ELEVATION INTELLIGENCE
            ──────────────────────────────────────────────────────────────── */}
            {showElevation && (
              <div className="absolute bottom-3 left-3 right-3 z-20 max-w-4xl mx-auto pointer-events-auto">
                <div className="rounded-xl border border-cyan-500/40 bg-[#080d16]/95 backdrop-blur-md shadow-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Mountain className="size-4 text-cyan-400" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                        3D MOUNTAIN PROFILE · {selectedConvoy.name.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <div className="text-muted-foreground">
                        All-Terrain Mode:{" "}
                        <strong className="text-emerald-400">Engaged (4WD Low)</strong>
                      </div>
                      <div className="text-muted-foreground">
                        Oxygen Saturation:{" "}
                        <strong className="text-amber-400">88% (High Altitude Advisory)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Altitude Profile Component */}
                  <ConvoyElevationProfile
                    selectedConvoy={selectedConvoy}
                    progress={convoyProgress}
                    isDiverted={isDiverted}
                    onToggleDivert={() => setIsDiverted((d) => !d)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            3. RIGHT SIDE: LIVE INCIDENTS & TACTICAL CONSOLE
        ────────────────────────────────────────────────────────────────── */}
        <div className="w-[360px] lg:w-[400px] shrink-0 bg-[#080d16] flex flex-col min-h-0 border-l border-border/80 z-10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 bg-[#0a101c] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                LIVE INCIDENTS ({WAR_ROOM_CURATED_INCIDENTS.length})
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              AUTO-SYNC · REALTIME
            </span>
          </div>

          {/* Curated Strategic Incidents List (Point 3) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
            {WAR_ROOM_CURATED_INCIDENTS.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    isSelected
                      ? "border-red-500/80 bg-red-950/30 shadow-lg shadow-red-950/50"
                      : "border-border/70 bg-[#0b121e] hover:border-border hover:bg-[#0e1626]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0 ${
                        inc.severity === "critical"
                          ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse"
                          : inc.severity === "high"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/50"
                      }`}
                    >
                      {inc.severity === "critical" ? "🚨 CRITICAL" : inc.severity === "high" ? "⚠ HIGH" : "🟡 MEDIUM"}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {inc.timeAgo}
                    </span>
                  </div>

                  <div className="mt-1 font-mono text-sm font-bold text-foreground">
                    {inc.title}
                  </div>

                  <div className="text-xs text-muted-foreground font-mono">
                    {inc.location}
                  </div>

                  {inc.debrisVolumeM3 ? (
                    <div className="mt-1 font-mono text-[10px] text-amber-300 flex items-center justify-between">
                      <span>Debris: {inc.debrisVolumeM3} m³</span>
                      <span>Impact: {inc.impactedConvoys.join(", ")}</span>
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 text-[10px] font-mono text-cyan-400">
                    <span>Click to auto-zoom & inspect</span>
                    <ArrowRight className="size-3" />
                  </div>
                </div>
              );
            })}

            {/* Additional Live DB Incidents if available */}
            {liveIncidents && liveIncidents.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold mb-2">
                  Database Incidents ({liveIncidents.length})
                </div>
                <div className="space-y-2">
                  {liveIncidents.slice(0, 3).map((dbInc) => (
                    <div
                      key={dbInc._id}
                      onClick={() =>
                        handleSelectIncident({
                          id: dbInc._id,
                          title: dbInc.locationName,
                          roadName: dbInc.locationName,
                          location: `${dbInc.district}, ${dbInc.state}`,
                          state: dbInc.state,
                          severity: dbInc.severity as "critical" | "high" | "medium",
                          timeAgo: "Active",
                          lat: dbInc.latitude,
                          lng: dbInc.longitude,
                          impactedConvoys: ["CV-05"],
                          aiRecommendation: "Proceed with caution or reroute.",
                          bypassRouteName: "Alternative Highway Bypass",
                          bypassDelta: "+15 km",
                          roadStatus: "Warning Issued",
                        })
                      }
                      className="rounded border border-border/60 bg-[#09101c] p-2 text-xs font-mono hover:border-primary cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{dbInc.locationName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{dbInc.severity}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {dbInc.district}, {dbInc.state}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────────────
              8. KILLER FEATURE: 'INCIDENT → RESPONSE' INTERACTIVE DOCK
          ──────────────────────────────────────────────────────────────── */}
          {selectedIncident && (
            <div className="border-t border-red-500/40 bg-[#0a111e] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-4 text-amber-400 animate-pulse" />
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-300">
                    INCIDENT → RESPONSE DOCK
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono border-amber-500/50 text-amber-300">
                  AI RECOMMENDATION ACTIVE
                </Badge>
              </div>

              {/* Step 1 & 2: Incident & AI Analysis */}
              <div className="rounded border border-border/70 bg-[#070c15] p-2 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-muted-foreground text-[10px]">
                  <span>1. Incident: {selectedIncident.title}</span>
                  <span className="text-red-400 font-bold">{selectedIncident.roadStatus}</span>
                </div>
                <div className="text-[11px] text-foreground">
                  <strong className="text-cyan-400">2. AI Analysis:</strong>{" "}
                  {selectedIncident.debrisVolumeM3
                    ? `${selectedIncident.debrisVolumeM3} m³ debris volume estimated by satellite SAR. Road 100% blocked.`
                    : "Severe structural scouring detected. Weight limit degraded."}
                </div>
                <div className="text-[11px] text-amber-300">
                  <strong>3. Impacted Convoys:</strong> {selectedIncident.impactedConvoys.join(", ")} (Relief Columns)
                </div>
                <div className="text-[11px] text-emerald-400">
                  <strong>4. AI Recommendation:</strong> {selectedIncident.aiRecommendation}
                </div>
              </div>

              {/* Step 5: ONE-CLICK EMERGENCY DIVERSION BUTTON */}
              <Button
                size="sm"
                onClick={handleEngageDiversion}
                disabled={diversionApplied}
                className={`w-full h-9 font-mono text-xs font-bold gap-2 shadow-lg transition-all ${
                  diversionApplied
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/40 animate-pulse"
                }`}
              >
                <Zap className="size-4" />
                {diversionApplied ? "✓ DIVERSION ENGAGED (ROUTE B ACTIVE)" : "⚡ ENGAGE EMERGENCY DIVERSION"}
              </Button>

              {diversionApplied && (
                <div className="rounded bg-emerald-950/40 border border-emerald-500/50 p-1.5 font-mono text-[10px] text-emerald-300 flex items-center justify-between">
                  <span>Convoys {selectedIncident.impactedConvoys.join(", ")} rerouted to Route B</span>
                  <span className="font-bold">ETA: +1h 15m</span>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              6. EMERGENCY ACTION DOCK (BOTTOM COMMAND ACTIONS)
          ──────────────────────────────────────────────────────────────── */}
          <div className="border-t border-border/80 bg-[#070b13] p-3 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
              <span>Quick Command Actions</span>
              <ShieldAlert className="size-3 text-red-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActionClick("alert")}
                className="h-8 text-[11px] font-mono border-red-500/40 text-red-300 bg-red-950/20 hover:bg-red-900/40 gap-1.5"
              >
                <Send className="size-3 text-red-400" />
                SEND ALERT
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActionClick("divert")}
                className="h-8 text-[11px] font-mono border-amber-500/40 text-amber-300 bg-amber-950/20 hover:bg-amber-900/40 gap-1.5"
              >
                <Navigation className="size-3 text-amber-400" />
                DIVERT CONVOY
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActionClick("card")}
                className="h-8 text-[11px] font-mono border-cyan-500/40 text-cyan-300 bg-cyan-950/20 hover:bg-cyan-900/40 gap-1.5"
              >
                <Share2 className="size-3 text-cyan-400" />
                GENERATE CARD
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActionClick("team")}
                className="h-8 text-[11px] font-mono border-blue-500/40 text-blue-300 bg-blue-950/20 hover:bg-blue-900/40 gap-1.5"
              >
                <Users className="size-3 text-blue-400" />
                DISPATCH TEAM
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          5. LEFT / SLIDEOVER: FLEET INTELLIGENCE (42 CONVOYS BREAKDOWN)
      ══════════════════════════════════════════════════════════════════════ */}
      {fleetOpen && (
        <div className="absolute inset-y-14 left-0 w-80 md:w-96 bg-[#080e18]/95 backdrop-blur-md border-r border-cyan-500/40 z-30 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between border-b border-border/80 bg-[#0b1320] px-4 py-3">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-cyan-400" />
              <div>
                <div className="font-mono text-xs font-bold uppercase text-foreground">
                  FLEET INTELLIGENCE (42 CONVOYS)
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Total Cargo: <strong className="text-cyan-300">628 MT</strong> Relief Consignment
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFleetOpen(false)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Cargo Breakdown Chips */}
          <div className="grid grid-cols-2 gap-1.5 p-3 border-b border-border/60 bg-[#09101b] font-mono text-[10px]">
            {FLEET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFleetFilter(cat.id === fleetFilter ? "all" : cat.id)}
                className={`rounded border p-1.5 text-left transition-all ${
                  fleetFilter === cat.id
                    ? "border-primary bg-primary/20 text-foreground font-bold"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{cat.icon} {cat.label}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{cat.count}</Badge>
                </div>
                <div className="text-[9px] text-muted-foreground/80 mt-0.5">{cat.cargoMT} MT Cargo</div>
              </button>
            ))}
          </div>

          {/* Convoys Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Showing: {filteredConvoys.length} Convoys</span>
              {fleetFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFleetFilter("all")}
                  className="text-cyan-400 hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {filteredConvoys.map((convoy) => (
              <div
                key={convoy.id}
                onClick={() => {
                  setMapFocus({ lat: convoy.lat, lng: convoy.lng, zoom: 11, key: Date.now() });
                  if (soundEnabled) playRadarChirp();
                }}
                className="rounded border border-border/70 bg-[#0b121e] p-2.5 space-y-1 hover:border-cyan-500/60 hover:bg-[#0e1726] transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">{convoy.id} · {convoy.callsign}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      convoy.status === "delayed"
                        ? "bg-red-500/20 text-red-300 border-red-500/50"
                        : convoy.status === "diverted"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    }`}
                  >
                    {convoy.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="text-[11px] text-muted-foreground">{convoy.cargoDesc}</div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>Weight: <strong>{convoy.weightMT} MT</strong></span>
                  <span>Corridor: <strong>{convoy.corridor}</strong></span>
                  <span>ETA: <strong>{convoy.eta}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          7. NETWORK / OFFLINE STATUS STRIP (BOTTOM STRIP)
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border/60 bg-[#05080e] px-4 font-mono text-[10px] text-muted-foreground z-20 overflow-x-auto">
        <div className="flex items-center gap-4 whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Assam: <strong className="text-emerald-400">ONLINE (10 Gbps Ring)</strong></span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Meghalaya: <strong className="text-emerald-400">ONLINE (Microwave 450Mbps)</strong></span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span>Arunachal: <strong className="text-amber-400">DEGRADED (VSAT FALLBACK)</strong></span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-red-400 animate-ping" />
            <span>Tawang Corridor: <strong className="text-red-400">OFFLINE (TACTICAL MESH ACTIVE)</strong></span>
          </span>
        </div>

        <div className="flex items-center gap-4 whitespace-nowrap pl-4">
          <span className="text-cyan-400">Queued Reports: <strong>7 (Auto-sync pending)</strong></span>
          <span>Last Sync: <strong className="text-foreground">{timeString.split("·")[1] || "00:00:00"}</strong></span>
        </div>
      </footer>

      {/* ═════════════════════════════════════════════════════════════════════
          6. MODAL: "CONFIRM EMERGENCY BROADCAST?" (Point 6 Requirement)
      ══════════════════════════════════════════════════════════════════════ */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-red-500/60 bg-[#0a0f1a] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-red-500 bg-red-950/60 text-red-400">
                <Siren className="size-6 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-wider text-red-400">
                  CONFIRM EMERGENCY BROADCAST?
                </div>
                <div className="text-[10px] text-muted-foreground">
                  MDoNER Defense JEOC Protocol 8-A Authorized
                </div>
              </div>
            </div>

            <div className="rounded border border-red-500/30 bg-red-950/20 p-3 text-muted-foreground space-y-2">
              <p>
                You are about to authorize an emergency broadcast signal to{" "}
                <strong className="text-foreground">42 active convoys</strong> and{" "}
                <strong className="text-foreground">12 field response teams</strong> across North East Region sectors.
              </p>
              <div className="text-[10px] text-amber-300">
                Action:{" "}
                <strong className="uppercase">
                  {broadcastActionType === "alert"
                    ? "Dispatch Real-time SMS & DLT Alert"
                    : broadcastActionType === "divert"
                      ? "Order Multi-Convoy Diversion to Bypass Route"
                      : broadcastActionType === "card"
                        ? "Generate & Publish Verified WhatsApp Crisis Notice"
                        : "Dispatch Heavy Quick Response NDRF Team"}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setBroadcastModalOpen(false)}
                className="h-8 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmBroadcast}
                className="h-8 gap-1.5 font-mono text-xs font-bold bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/50"
              >
                <Zap className="size-3.5" /> CONFIRM & EXECUTE
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Crisis Card Generator Overlay */}
      {emergencyCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-xl border border-cyan-500/60 bg-[#080e18] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="size-5 text-cyan-400" />
                <span className="font-mono text-sm font-bold uppercase text-foreground">
                  EMERGENCY DISASTER CRISIS CARD GENERATOR
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEmergencyCardModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>
            <DisasterAlertCardGenerator />
          </div>
        </div>
      )}

      {/* Multi-Sector Emergency SMS Dispatch Overlay */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl border border-amber-500/60 bg-[#080e18] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <Send className="size-5 text-amber-400" />
                <span className="font-mono text-sm font-bold uppercase text-foreground">
                  MULTI-SECTOR SMS & FIELD DISPATCH PANEL
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSmsModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>
            <SmsAutomationPanel
              currentAlert={{
                title: selectedIncident?.title || "NH-13 Emergency Landslide Disruption",
                severity: selectedIncident?.severity || "critical",
                locationName: selectedIncident?.location || "Tawang Corridor, Arunachal Pradesh",
                recommendedAction:
                  selectedIncident?.aiRecommendation || "Engage Route B Sangti Valley bypass.",
              }}
            />
          </div>
        </div>
      )}

      {/* 3-Level Tactical Siren Manager & Audio Uploader Overlay */}
      {sirenUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl border border-red-500/60 bg-[#080e18] p-5 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-mono">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded bg-red-950/60 border border-red-500/50 text-red-400">
                  <Siren className="size-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-foreground">
                    DEFCON 3-LEVEL SIREN AUDIO INTELLIGENCE
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Official siren audio tracks for DEFCON 1 (Critical), DEFCON 2 (Elevated), DEFCON 3 (Advisory)
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSirenUploadModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Siren Levels Grid */}
            <div className="space-y-3">
              {[
                {
                  level: 1,
                  title: "DEFCON 1 · Maximum Threat / Road Blocked",
                  color: "border-red-500/50 bg-red-950/20 text-red-400",
                  badge: "bg-red-500 text-white",
                  path: "/audio/siren-defcon1.wav",
                  desc: "High-urgency wailing defense sweep for full NH blockages & active landslide crisis.",
                },
                {
                  level: 2,
                  title: "DEFCON 2 · Elevated Risk / Convoy Diverting",
                  color: "border-amber-500/50 bg-amber-950/20 text-amber-400",
                  badge: "bg-amber-500 text-white",
                  path: "/audio/siren-defcon2.wav",
                  desc: "Rapid alternating warning tone for high hazard, flash flood risks & critical bridge alerts.",
                },
                {
                  level: 3,
                  title: "DEFCON 3 · Precautionary Advisory / Readiness",
                  color: "border-emerald-500/50 bg-emerald-950/20 text-emerald-400",
                  badge: "bg-emerald-500 text-white",
                  path: "/audio/siren-defcon3.wav",
                  desc: "Advisory chime & pulse for IMD monsoon warnings, heavy fog & route maintenance.",
                },
              ].map((s) => (
                <div
                  key={s.level}
                  className={`rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${s.color}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.badge}`}>
                        LEVEL {s.level}
                      </span>
                      <span className="text-xs font-bold text-foreground">{s.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Music className="size-3" />
                      <span>Source: {customSirens[s.level] ? "Custom Uploaded Audio (Active)" : s.path}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Test Play Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playSirenForDefcon(s.level, customSirens)}
                      className="h-8 gap-1.5 text-xs font-mono border-current hover:bg-white/10"
                    >
                      <Volume2 className="size-3.5" />
                      <span>Test Audio</span>
                    </Button>

                    {/* Replace / Upload Audio */}
                    <label className="cursor-pointer">
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border/80 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                        <Upload className="size-3" />
                        <span>Upload Custom</span>
                      </span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setCustomSirens((prev) => ({ ...prev, [s.level]: url }));
                            const audio = new Audio(url);
                            audio.play().catch(() => {});
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Reset & Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                All 3 sirens are loaded in <code className="text-emerald-300">public/audio/</code> with automatic Web Audio backup.
              </span>
              {Object.keys(customSirens).length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCustomSirens({})}
                  className="h-7 text-xs text-red-400 hover:text-red-300"
                >
                  Reset to System Sirens
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

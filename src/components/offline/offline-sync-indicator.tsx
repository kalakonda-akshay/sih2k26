"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Wifi,
  WifiOff,
  Database,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  PlusCircle,
  RefreshCw,
  Radio,
  FileText,
  Clock,
  MapPin,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOfflineQueue } from "@/components/field/use-offline-queue";
import {
  listPending,
  enqueueReport,
  clearAllPending,
  newClientUuid,
  type QueuedReport,
} from "@/lib/offline-queue";

export function OfflineSyncIndicator() {
  const { t } = useTranslation();
  const { pending, drain, deliver, refresh } = useOfflineQueue();
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [pendingReports, setPendingReports] = useState<QueuedReport[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Monitor browser online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch pending reports whenever sheet opens or count changes
  const loadReports = useCallback(async () => {
    try {
      const list = await listPending();
      setPendingReports(list);
    } catch {
      setPendingReports([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen || pending > 0) {
      loadReports();
    }
  }, [isOpen, pending, loadReports]);

  // Generate a realistic field report to demonstrate IndexedDB queuing
  const handleAddTestReport = async () => {
    setIsAdding(true);
    try {
      const sampleLocations = [
        {
          name: "Sela Pass North Slope (NH-13, Km 84)",
          state: "Arunachal Pradesh",
          district: "West Kameng",
          lat: 27.502,
          lng: 92.105,
          type: "landslide",
          severity: "critical",
          desc: "Major boulder fall blocking both carriageways. BRO bulldozer deployed from Bhalukpong.",
        },
        {
          name: "Sonapur Tunnel Mudflow Sector (NH-6)",
          state: "Meghalaya",
          district: "East Jaintia Hills",
          lat: 25.121,
          lng: 92.368,
          type: "flooding",
          severity: "high",
          desc: "Heavy flash torrent overflowing culvert #14. Light vehicular transit halted.",
        },
        {
          name: "Zunheboto Hill Highway (MDR-22)",
          state: "Nagaland",
          district: "Zunheboto",
          lat: 25.972,
          lng: 94.521,
          type: "road_damage",
          severity: "medium",
          desc: "Subgrade subsidence along 35 meters of hill embankment after torrential rain.",
        },
      ];

      const sample = sampleLocations[pending % sampleLocations.length];
      const now = Date.now();

      const newReport: QueuedReport = {
        clientUuid: newClientUuid(),
        deviceTs: now,
        queuedAt: now,
        attempts: 0,
        payload: {
          incidentType: sample.type,
          description: sample.desc,
          severity: sample.severity,
          latitude: sample.lat,
          longitude: sample.lng,
          locationName: sample.name,
          state: sample.state,
          district: sample.district,
          reportedBy: "Field_Officer_Mesh",
        },
      };

      await enqueueReport(newReport);
      await refresh();
      await loadReports();
    } finally {
      setIsAdding(false);
    }
  };

  const handleClear = async () => {
    await clearAllPending();
    await refresh();
    await loadReports();
  };

  const effectiveOnline = isOnline && !isSimulatedOffline;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary"
            title="Offline-First Mesh Status & Sync Queue"
          />
        }
      >
        {effectiveOnline ? (
          <span className="flex size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        ) : (
          <span className="flex size-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
        )}

        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {effectiveOnline ? "Mesh Ready" : "Mesh Offline"}
        </span>

        {pending > 0 && (
          <span className="ml-0.5 flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-400">
            <UploadCloud className="size-3 animate-bounce" />
            {pending}
          </span>
        )}
      </SheetTrigger>


      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card border-border">
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="size-5 text-primary animate-pulse" />
              <SheetTitle className="text-base font-semibold">
                Offline Field Mesh Engine
              </SheetTitle>
            </div>
            <Badge
              variant={effectiveOnline ? "default" : "destructive"}
              className="font-mono text-[10px] uppercase tracking-widest"
            >
              {effectiveOnline ? "Cloud Connected" : "Local IndexedDB Mode"}
            </Badge>
          </div>
          <SheetDescription className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Preserves disaster incident observations in hardware <strong>IndexedDB</strong> during mountain cellular blackouts. Zero data loss during North East monsoons.
          </SheetDescription>
        </div>

        {/* Status & Controls Bar */}
        <div className="p-4 border-b border-border bg-background/50 space-y-3">
          {/* Quick Simulation Toggles */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-3">
            <div className="flex items-center gap-2.5">
              {effectiveOnline ? (
                <Wifi className="size-4 text-emerald-400" />
              ) : (
                <WifiOff className="size-4 text-amber-400" />
              )}
              <div>
                <div className="text-xs font-medium">
                  {effectiveOnline ? "Live Cellular 4G Uplink" : "Cellular Outage / Offline"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isSimulatedOffline ? "Simulation mode enabled" : "Native browser connection"}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant={isSimulatedOffline ? "destructive" : "outline"}
              className="h-7 text-xs font-mono"
              onClick={() => setIsSimulatedOffline((prev) => !prev)}
            >
              {isSimulatedOffline ? "Resume Online" : "Simulate Cut-Off"}
            </Button>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-dashed"
              onClick={handleAddTestReport}
              disabled={isAdding}
            >
              {isAdding ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <PlusCircle className="size-3.5 text-primary" />
              )}
              + Log Offline Incident
            </Button>

            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={pending === 0 || drain.state === "draining"}
              onClick={() => deliver()}
            >
              {drain.state === "draining" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Syncing {drain.done}/{drain.total}…
                </>
              ) : (
                <>
                  <UploadCloud className="size-3.5" />
                  Sync Queue ({pending})
                </>
              )}
            </Button>
          </div>

          {drain.state === "done" && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Synced <strong>{drain.delivered}</strong> report(s) directly to Convex Cloud DB!
              </span>
            </div>
          )}

          {drain.state === "error" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{drain.message}</span>
            </div>
          )}
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Database className="size-3.5 text-primary" />
              Pending IndexedDB Records ({pendingReports.length})
            </span>

            {pendingReports.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Trash2 className="size-3" />
                Clear
              </button>
            )}
          </div>

          {pendingReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border/80 bg-background/30 text-muted-foreground my-4">
              <CheckCircle2 className="size-8 text-emerald-500/60 mb-2" />
              <p className="text-xs font-medium text-foreground">
                All Local Records In Sync
              </p>
              <p className="mt-1 text-[11px] max-w-xs text-muted-foreground">
                Click <strong>&quot;+ Log Offline Incident&quot;</strong> above to simulate field logging when deep in Himalayan valleys without coverage.
              </p>
            </div>
          ) : (
            pendingReports.map((report) => (
              <div
                key={report.clientUuid}
                className="rounded-lg border border-border bg-card/60 p-3 text-xs space-y-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary" />
                    {report.payload.locationName}
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase tracking-wide border-amber-500/40 text-amber-400 bg-amber-500/10"
                  >
                    {report.payload.severity}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {report.payload.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {report.payload.latitude.toFixed(3)}, {report.payload.longitude.toFixed(3)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(report.deviceTs).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border bg-background/80 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="size-3.5 text-primary" />
            MDoNER Resilience Protocol v2.4
          </span>
          <span className="font-mono text-[10px]">
            IDB: ner-vision-offline
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

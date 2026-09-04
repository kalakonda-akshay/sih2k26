"use client";

import { useQuery } from "convex/react";
import { Crosshair } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { MapIntelligence } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import {
  ALERT_TYPE_LABEL,
  INCIDENT_LABEL,
  RISK_TONE,
  SEVERITY_TONE,
  VEHICLE_STATUS_TONE,
  type RiskLevel,
  type Severity,
} from "@/lib/risk";

/**
 * Live intelligence side panel.
 *
 * Four queues of things a controller may need to look at, each row wired to
 * re-centre the map on its location. Tabbed rather than stacked so the panel
 * stays usable at laptop height without becoming a scroll marathon.
 */
export function IntelligencePanel({
  data,
  onFocus,
  className,
}: {
  data: MapIntelligence | undefined;
  onFocus: (lat: number, lng: number, zoom?: number) => void;
  className?: string;
}) {
  const alerts = useQuery(api.alerts.listActiveAlerts, { limit: 12 });

  // Straight-line proximity only — see `vehicles in high-risk zones` note.
  const riskVehicles =
    data?.vehicles.filter(
      (v) => v.riskLevel === "high" || v.riskLevel === "critical",
    ) ?? [];

  const highRiskPredictions =
    data?.predictions.filter(
      (p) => p.riskLevel === "high" || p.riskLevel === "critical",
    ) ?? [];

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Live Intelligence</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Select an item to focus the map
        </p>
      </header>

      <Tabs defaultValue="alerts" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-4">
          <TabsTrigger value="alerts" className="text-[11px]">
            Alerts
            <Count value={alerts?.length} />
          </TabsTrigger>
          <TabsTrigger value="incidents" className="text-[11px]">
            Incidents
            <Count value={data?.incidents.length} />
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-[11px]">
            Risk
            <Count value={highRiskPredictions.length} />
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="text-[11px]">
            Fleet
            <Count value={riskVehicles.length} />
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- alerts -- */}
        <TabsContent
          value="alerts"
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          {alerts === undefined && <RowSkeletons />}
          {alerts?.length === 0 && <Empty>No active alerts.</Empty>}
          {alerts?.map((alert) => {
            const tone = SEVERITY_TONE[alert.severity as Severity];
            const focusable =
              alert.latitude !== undefined && alert.longitude !== undefined;

            return (
              <Row
                key={alert._id}
                hex={tone.hex}
                title={alert.title}
                meta={`${ALERT_TYPE_LABEL[alert.alertType] ?? alert.alertType} · ${alert.locationName ?? "Region"}`}
                time={timeAgo(alert.createdAt)}
                onFocus={
                  focusable
                    ? () => onFocus(alert.latitude!, alert.longitude!, 10)
                    : undefined
                }
              />
            );
          })}
        </TabsContent>

        {/* ------------------------------------------------- incidents -- */}
        <TabsContent
          value="incidents"
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          {data === undefined && <RowSkeletons />}
          {data?.incidents.length === 0 && <Empty>No active incidents.</Empty>}
          {data?.incidents.map((incident) => {
            const tone = SEVERITY_TONE[incident.severity as Severity];
            return (
              <Row
                key={incident._id}
                hex={tone.hex}
                title={
                  INCIDENT_LABEL[incident.incidentType] ?? incident.incidentType
                }
                meta={`${incident.locationName} · ${incident.district}${incident.verified ? " · verified" : " · unverified"}`}
                time={timeAgo(incident.createdAt)}
                onFocus={() =>
                  onFocus(incident.latitude, incident.longitude, 11)
                }
              />
            );
          })}
        </TabsContent>

        {/* ------------------------------------------------------ risk -- */}
        <TabsContent
          value="risk"
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          {data === undefined && <RowSkeletons />}
          {data !== undefined && highRiskPredictions.length === 0 && (
            <Empty>No high-risk predictions.</Empty>
          )}
          {highRiskPredictions.map((prediction) => {
            const tone = RISK_TONE[prediction.riskLevel as RiskLevel];
            return (
              <Row
                key={prediction._id}
                hex={tone.hex}
                badge="Predicted"
                title={prediction.predictedIssue}
                meta={`${prediction.locationName} · ${Math.round(prediction.riskScore)}/100 · ${Math.round(prediction.confidence)}% conf.`}
                time={timeAgo(prediction.createdAt)}
                onFocus={() =>
                  onFocus(prediction.latitude, prediction.longitude, 10)
                }
              />
            );
          })}
        </TabsContent>

        {/* -------------------------------------------------- vehicles -- */}
        <TabsContent
          value="vehicles"
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          {data === undefined && <RowSkeletons />}
          {data !== undefined && riskVehicles.length === 0 && (
            <Empty>No vehicles in high-risk zones.</Empty>
          )}
          {riskVehicles.map((vehicle) => {
            const tone = RISK_TONE[vehicle.riskLevel as RiskLevel];
            const statusTone =
              VEHICLE_STATUS_TONE[vehicle.status] ?? VEHICLE_STATUS_TONE.idle;
            return (
              <Row
                key={vehicle._id}
                hex={tone.hex}
                title={vehicle.vehicleNumber}
                meta={`${statusTone.label} · ${vehicle.cargoType} → ${vehicle.destination}`}
                time={timeAgo(vehicle.lastUpdated)}
                onFocus={() =>
                  onFocus(vehicle.latitude, vehicle.longitude, 11)
                }
              />
            );
          })}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function Count({ value }: { value: number | undefined }) {
  if (value === undefined || value === 0) return null;
  return (
    <span className="ml-1 font-mono text-[9px] tabular opacity-70">
      {value}
    </span>
  );
}

function Row({
  hex,
  title,
  meta,
  time,
  badge,
  onFocus,
}: {
  hex: string;
  title: string;
  meta: string;
  time: string;
  badge?: string;
  onFocus?: () => void;
}) {
  const interactive = Boolean(onFocus);

  return (
    <button
      type="button"
      onClick={onFocus}
      disabled={!interactive}
      className={cn(
        "group flex w-full items-start gap-2.5 rounded-md border border-transparent px-2 py-2 text-left transition-colors",
        interactive
          ? "hover:border-border hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          : "cursor-default opacity-80",
      )}
    >
      <span
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {badge && (
            <span
              className="shrink-0 rounded border px-1 py-px font-mono text-[8px] uppercase tracking-wider"
              style={{ borderColor: `${hex}59`, color: hex }}
            >
              {badge}
            </span>
          )}
          <span className="truncate text-xs font-medium">{title}</span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {meta}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[9px] text-muted-foreground">
          {time}
        </span>
        {interactive && (
          <Crosshair className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </span>
    </button>
  );
}

function RowSkeletons() {
  return (
    <div className="flex flex-col gap-3 p-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-10 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

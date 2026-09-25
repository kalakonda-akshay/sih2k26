"use client";

import { useQuery } from "convex/react";
import { Crosshair, Radio } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTranslation } from "react-i18next";
import {
  ACCESS_TONE,
  CARGO_LABEL,
  INCIDENT_LABEL,
  RISK_TONE,
  VEHICLE_STATUS_TONE,
  VEHICLE_TYPE_LABEL,
  getTranslatedCargo,
  getTranslatedRiskLevel,
  getTranslatedVehicleStatus,
  getTranslatedVehicleType,
  getTranslatedIncidentType,
  type AccessibilityStatus,
  type RiskLevel,
} from "@/lib/risk";
import {
  formatCoords,
  formatDateTime,
  humanize,
  timeAgo,
  timeUntil,
} from "@/lib/format";
import { formatLocalizedTimeAgo, translatePredictedIssue } from "@/lib/i18n/briefing-translator";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Vehicle detail panel.
 *
 * One `fleet.getVehicleDetail` subscription supplies the vehicle, its
 * consignment, the nearest corridor, live hazards around it and its slice of
 * the shared activity log — so the panel stays live while it is open without
 * five separate queries.
 */
export function VehicleDetails({
  vehicleId,
  onClose,
  onFocusMap,
}: {
  vehicleId: Id<"vehicles"> | null;
  onClose: () => void;
  onFocusMap?: (lat: number, lng: number) => void;
}) {
  const { t } = useTranslation();
  const detail = useQuery(
    api.fleet.getVehicleDetail,
    vehicleId ? { vehicleId } : "skip",
  );

  return (
    <Sheet open={vehicleId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetTitle className="sr-only">{t("vehicles.title", "Vehicle details")}</SheetTitle>

        {detail === undefined && vehicleId !== null && (
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {detail === null && (
          <div className="p-6 text-sm text-muted-foreground">
            {t("vehicles.not_found", "That vehicle is no longer available.")}
          </div>
        )}

        {detail && (
          <div className="flex flex-col">
            <VehicleHeader detail={detail} onFocusMap={onFocusMap} />
            <VehicleInfoSection detail={detail} />
            <DeliverySection detail={detail} />
            <RiskSection detail={detail} />
            <TimelineSection detail={detail} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Detail = NonNullable<
  ReturnType<typeof useQuery<typeof api.fleet.getVehicleDetail>>
>;

function VehicleHeader({
  detail,
  onFocusMap,
}: {
  detail: Detail;
  onFocusMap?: (lat: number, lng: number) => void;
}) {
  const { t } = useTranslation();
  const { vehicle, exposure } = detail;
  const statusTone =
    VEHICLE_STATUS_TONE[vehicle.status] ?? VEHICLE_STATUS_TONE.idle;
  const exposureTone = RISK_TONE[exposure.riskLevel as RiskLevel];

  return (
    <header className="border-b border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {getTranslatedVehicleType(vehicle.vehicleType, t)}
          </div>
          <h2 className="mt-1 font-mono text-lg font-semibold tracking-tight">
            {vehicle.vehicleNumber}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                statusTone.chip,
                statusTone.border,
                statusTone.text,
              )}
            >
              {getTranslatedVehicleStatus(vehicle.status, t)}
            </span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                exposureTone.chip,
                exposureTone.border,
                exposureTone.text,
              )}
            >
              {getTranslatedRiskLevel(exposure.riskLevel, t)} {t("vehicles.exposure", "exposure")}
            </span>
          </div>
        </div>

        {onFocusMap && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1.5 text-xs"
            onClick={() => onFocusMap(vehicle.latitude, vehicle.longitude)}
          >
            <Crosshair className="size-3" />
            {t("map.focus", "Focus")}
          </Button>
        )}
      </div>
    </header>
  );
}

function VehicleInfoSection({ detail }: { detail: Detail }) {
  const { t, i18n } = useTranslation();
  const { vehicle } = detail;

  return (
    <Section title={t("vehicles.info_and_location", "Vehicle & live location")} icon={Radio}>
      <Grid
        rows={[
          [t("vehicles.driver", "Driver"), vehicle.driverName],
          [t("vehicles.contact", "Contact"), vehicle.driverPhone],
          [
            t("vehicles.cargo", "Cargo"),
            getTranslatedCargo(vehicle.cargoType, t),
          ],
          [t("vehicles.position", "Position"), formatCoords(vehicle.latitude, vehicle.longitude)],
          [t("vehicles.speed", "Speed"), `${Math.round(vehicle.speed)} km/h`],
          [t("vehicles.heading", "Heading"), `${Math.round(vehicle.heading)}°`],
          [t("vehicles.destination", "Destination"), vehicle.destination],
          [t("vehicles.updated", "Last update"), formatLocalizedTimeAgo(vehicle.lastUpdated, i18n.language)],
        ]}
      />
    </Section>
  );
}

function DeliverySection({ detail }: { detail: Detail }) {
  const { t } = useTranslation();
  const { delivery, route } = detail;

  if (!delivery) {
    return (
      <Section title={t("deliveries.title", "Delivery")}>
        <p className="text-xs text-muted-foreground">
          {t("deliveries.no_consignments", "No active consignment assigned to this vehicle.")}
        </p>
      </Section>
    );
  }

  const isPriority =
    delivery.priority === "critical" || delivery.priority === "emergency";

  return (
    <Section title={t("deliveries.title", "Delivery")}>
      <Grid
        rows={[
          [t("routes.origin", "Origin"), delivery.origin],
          [t("routes.destination", "Destination"), delivery.destination],
          [t("deliveries.priority", "Priority"), t(`deliveries.priority_${delivery.priority}`, humanize(delivery.priority))],
          [t("common.status", "Status"), t(`deliveries.status_${delivery.status}`, humanize(delivery.status))],
          [t("deliveries.eta", "ETA"), timeUntil(delivery.estimatedArrival)],
          [t("deliveries.scheduled", "Scheduled"), formatDateTime(delivery.estimatedArrival)],
          ...(route ? ([[t("routes.title", "Route"), route.name]] as Array<[string, string]>) : []),
          ...(route
            ? ([[t("routes.status", "Route status"), humanize(route.status)]] as Array<
                [string, string]
              >)
            : []),
        ]}
      />

      {delivery.progress !== undefined && delivery.progress !== null && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              {t("deliveries.progress", "Progress")}
            </span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">
              {Math.round(delivery.progress)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                isPriority
                  ? "bg-[oklch(0.648_0.201_22)]"
                  : "bg-[oklch(0.715_0.128_231)]",
              )}
              style={{ width: `${Math.min(delivery.progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Section>
  );
}

function RiskSection({ detail }: { detail: Detail }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { exposure, road, nearbyIncidents, nearbyPredictions } = detail;
  const tone = RISK_TONE[exposure.riskLevel as RiskLevel];

  return (
    <Section title={t("risk.title", "Risk intelligence")}>
      {road && (
        <div className="mb-3 rounded-md border border-border bg-background/50 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">
              {road.roadNumber}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {road.roadName}
            </span>
            <span
              className={cn(
                "ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider",
                ACCESS_TONE[road.accessibilityStatus as AccessibilityStatus]
                  .text,
              )}
            >
              {
                ACCESS_TONE[road.accessibilityStatus as AccessibilityStatus]
                  .label
              }
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {t("risk.corridor_risk", "Corridor risk")} {Math.round(road.riskScore)}/100
            {detail.roadDistanceKm !== null
              ? ` · ${Math.round(detail.roadDistanceKm)} km ${t("vehicles.from_vehicle", "from vehicle")}`
              : ""}
          </div>
        </div>
      )}

      {exposure.reasons.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("dashboard.no_vehicles_risk", "No hazard within range of this vehicle.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exposure.reasons.map((reason) => (
            <li key={reason.code} className="flex items-start gap-2">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: RISK_TONE[reason.level as RiskLevel].hex,
                }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium">{reason.label}</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {reason.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {nearbyIncidents.length > 0 && (
        <SubList
          title={`${t("dashboard.incidents", "Nearby incidents")} (${nearbyIncidents.length})`}
          items={nearbyIncidents.map((i) => ({
            key: `${i.locationName}-${i.distanceKm}`,
            label: `${getTranslatedIncidentType(i.incidentType, t)} — ${i.locationName}`,
            meta: `${Math.round(i.distanceKm)} km · ${i.severity}`,
          }))}
        />
      )}

      {nearbyPredictions.length > 0 && (
        <SubList
          title={`${t("risk.title", "Predicted risk zones")} (${nearbyPredictions.length})`}
          items={nearbyPredictions.map((p) => ({
            key: `${p.locationName}-${p.distanceKm}`,
            label: `${translatePredictedIssue(p.predictedIssue, currentLang)} — ${p.locationName}`,
            meta: `${Math.round(p.distanceKm)} km · ${getTranslatedRiskLevel(p.riskLevel, t)}`,
          }))}
        />
      )}

      <p className={cn("mt-3 text-[10px] leading-relaxed", tone.text)}>
        {t("vehicles.exposure_note", "Distances are straight-line, not road-network. Treat them as a proximity warning, not a drive-time estimate.")}
      </p>
    </Section>
  );
}

function TimelineSection({ detail }: { detail: Detail }) {
  const { t, i18n } = useTranslation();
  const { timeline } = detail;

  return (
    <Section title={t("dashboard.system_activity", "Activity timeline")}>
      {timeline.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("dashboard.no_activity", "No recorded events for this vehicle yet.")}
        </p>
      ) : (
        <ol className="relative flex flex-col">
          <span
            className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-border"
            aria-hidden
          />
          {timeline.map((entry) => (
            <li key={entry._id} className="relative pb-3 pl-5 last:pb-0">
              <span
                className="absolute left-0 top-1.5 size-[7px] rounded-full bg-primary ring-2 ring-card"
                aria-hidden
              />
              <p className="text-[11px] leading-relaxed text-foreground/90">
                {entry.message}
              </p>
              <span className="font-mono text-[9px] text-muted-foreground">
                {formatLocalizedTimeAgo(entry.createdAt, i18n.language)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- atoms */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border p-5 last:border-b-0">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Grid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-[11px] text-muted-foreground">{key}</dt>
          <dd className="truncate text-right text-[11px] font-medium">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SubList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; label: string; meta: string }>;
}) {
  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
        {title}
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-baseline gap-2 text-[11px]">
            <span className="min-w-0 flex-1 truncate text-foreground/85">
              {item.label}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {item.meta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

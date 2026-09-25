"use client";

import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getTranslatedCargo, RISK_TONE, type RiskLevel } from "@/lib/risk";
import { formatLocalizedTimeAgo } from "@/lib/i18n/briefing-translator";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Vehicles exposed to current hazards, worst first.
 *
 * Each row lists the reasons the exposure model fired, so an operator can see
 * *why* a vehicle is flagged rather than trusting a bare badge.
 */
export function HighRiskVehicles({
  onSelect,
  limit = 8,
}: {
  onSelect: (id: Id<"vehicles">) => void;
  limit?: number;
}) {
  const { t, i18n } = useTranslation();
  const vehicles = useQuery(api.fleet.getHighRiskVehicles, { limit });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ShieldAlert className="size-4 text-[oklch(0.727_0.163_55)]" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t("vehicles.needing_attention", "Vehicles Needing Attention")}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("vehicles.exposure_subtitle", "Proximity exposure to live hazards")}
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {vehicles ? vehicles.length : "…"}
        </span>
      </header>

      <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
        {vehicles === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}

        {vehicles?.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.no_vehicles_risk", "No vehicle is currently exposed to an elevated hazard.")}
            </p>
          </div>
        )}

        {vehicles?.map((vehicle) => {
          const tone = RISK_TONE[vehicle.exposureLevel as RiskLevel];

          return (
            <button
              key={vehicle._id}
              type="button"
              onClick={() => onSelect(vehicle._id)}
              className="relative block w-full p-4 text-left transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className="absolute inset-y-0 left-0 w-0.5"
                style={{ backgroundColor: tone.hex }}
              />

              <div className="flex items-start gap-3 pl-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-sm font-semibold">
                      {vehicle.vehicleNumber}
                    </span>
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        tone.chip,
                        tone.border,
                        tone.text,
                      )}
                    >
                      {t(`risk.${vehicle.exposureLevel}`, tone.label)} {t("vehicles.exposure", "exposure")}
                    </span>
                    {vehicle.deliveryPriority && (
                      <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {t(`deliveries.priority_${vehicle.deliveryPriority}`, vehicle.deliveryPriority)}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {getTranslatedCargo(vehicle.cargoType, t)} →{" "}
                    {vehicle.destination}
                    {vehicle.roadNumber ? ` · ${vehicle.roadNumber}` : ""}
                  </p>

                  <ul className="mt-2 flex flex-col gap-1">
                    {vehicle.reasons.slice(0, 3).map((reason) => (
                      <li
                        key={reason.code}
                        className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                      >
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              RISK_TONE[reason.level as RiskLevel].hex,
                          }}
                        />
                        <span className="text-foreground/80">
                          <span className="font-medium">{reason.label}</span>
                          {" — "}
                          <span className="text-muted-foreground">
                            {reason.detail}
                          </span>
                        </span>
                      </li>
                    ))}
                    {vehicle.reasons.length > 3 && (
                      <li className="pl-2.5 font-mono text-[10px] text-muted-foreground">
                        {t("common.more_count", "+{{count}} more", { count: vehicle.reasons.length - 3 })}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="shrink-0 text-right">
                  {vehicle.nearestIncidentKm !== null && (
                    <div className={cn("font-mono text-sm tabular", tone.text)}>
                      {Math.round(vehicle.nearestIncidentKm)} km
                    </div>
                  )}
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                    {vehicle.nearestIncidentKm !== null
                      ? t("vehicles.to_incident", "to incident")
                      : t("vehicles.no_incident", "no incident")}
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-muted-foreground">
                    {formatLocalizedTimeAgo(vehicle.lastUpdated, i18n.language)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="border-t border-border bg-background/40 px-4 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
        {t("vehicles.exposure_note", "Exposure uses straight-line distance, not road-network distance. It over-triggers by design — a false flag is cheaper than a missed one.")}
      </p>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  getTranslatedCargo,
  getTranslatedRiskLevel,
  getTranslatedVehicleStatus,
  getTranslatedVehicleType,
  RISK_TONE,
  VEHICLE_STATUS_TONE,
  type RiskLevel,
} from "@/lib/risk";
import { formatLocalizedTimeAgo } from "@/lib/i18n/briefing-translator";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const ALL = "all";

const FILTER_GROUPS = [
  {
    key: "status" as const,
    label: "Status",
    options: ["active", "delayed", "emergency", "idle", "offline"],
  },
  {
    key: "cargoType" as const,
    label: "Cargo",
    options: [
      "medicine",
      "food",
      "agricultural",
      "construction",
      "fuel",
      "emergency",
    ],
  },
  {
    key: "exposureLevel" as const,
    label: "Exposure",
    options: ["low", "moderate", "high", "critical"],
  },
  {
    key: "deliveryPriority" as const,
    label: "Priority",
    options: ["normal", "high", "critical", "emergency"],
  },
];

type FilterKey = (typeof FILTER_GROUPS)[number]["key"];

/**
 * Live vehicle list.
 *
 * Filtering and search run in memory over one reactive subscription: the
 * fleet is tens of documents, so a round trip per keystroke would be slower
 * and would drop the live connection on every change.
 */
export function VehicleTable({
  onSelect,
  selectedId,
}: {
  onSelect: (id: Id<"vehicles">) => void;
  selectedId: Id<"vehicles"> | null;
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const fleet = useQuery(api.fleet.listFleet);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    status: ALL,
    cargoType: ALL,
    exposureLevel: ALL,
    deliveryPriority: ALL,
  });

  const rows = useMemo(() => {
    if (!fleet) return undefined;
    const term = search.trim().toLowerCase();

    return fleet.filter((v) => {
      for (const group of FILTER_GROUPS) {
        const wanted = filters[group.key];
        if (wanted === ALL) continue;
        if ((v[group.key] ?? "") !== wanted) return false;
      }

      if (!term) return true;
      return (
        v.vehicleNumber.toLowerCase().includes(term) ||
        v.driverName.toLowerCase().includes(term) ||
        v.destination.toLowerCase().includes(term)
      );
    });
  }, [fleet, filters, search]);

  const activeFilterCount = FILTER_GROUPS.filter(
    (g) => filters[g.key] !== ALL,
  ).length;

  const reset = () => {
    setFilters({
      status: ALL,
      cargoType: ALL,
      exposureLevel: ALL,
      deliveryPriority: ALL,
    });
    setSearch("");
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="space-y-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {t("vehicles.title", "Live Vehicle List")}
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {rows
                ? `${rows.length} / ${fleet?.length ?? 0} ${t("dashboard.vehicles_count", { count: "" }).replace(/\{\{count\}\}|\s*$/g, "").trim() || "vehicles"}`
                : t("common.loading", "Loading")}
            </p>
          </div>

          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                "header.search_placeholder",
                "Vehicle, driver or destination…",
              )}
              aria-label={t("common.search", "Search vehicles")}
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FILTER_GROUPS.map((group) => (
            <div key={group.key} className="flex flex-wrap items-center gap-1">
              <span className="mr-0.5 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
                {group.key === "status"
                  ? t("common.status", group.label)
                  : group.key === "cargoType"
                    ? t("vehicles.cargo", group.label)
                    : group.key === "exposureLevel"
                      ? t("risk.score", group.label)
                      : t("deliveries.priority", group.label)}
              </span>
              {[ALL, ...group.options].map((option) => {
                const selected = filters[group.key] === option;
                const optionLabel =
                  option === ALL
                    ? t("dashboard.all", "all")
                    : group.key === "status"
                      ? getTranslatedVehicleStatus(option, t)
                      : group.key === "cargoType"
                        ? getTranslatedCargo(option, t)
                        : group.key === "exposureLevel"
                          ? getTranslatedRiskLevel(option, t)
                          : t(`deliveries.priority_${option}`, option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({ ...f, [group.key]: option }))
                    }
                    aria-pressed={selected}
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {optionLabel}
                  </button>
                );
              })}
            </div>
          ))}

          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              onClick={reset}
              className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-2.5" />
              {t("common.reset", "Clear")}
            </button>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {[
                { key: "v", label: t("vehicles.vehicle_number", "Vehicle") },
                { key: "t", label: t("vehicles.type", "Type") },
                { key: "c", label: t("vehicles.cargo", "Cargo") },
                { key: "s", label: t("vehicles.status", "Status") },
                { key: "e", label: t("risk.score", "Exposure") },
                { key: "p", label: t("deliveries.priority", "Priority") },
                { key: "sp", label: t("vehicles.speed", "Speed") },
                { key: "d", label: t("vehicles.destination", "Destination") },
                { key: "cr", label: t("risk.corridor", "Corridor") },
                { key: "u", label: t("vehicles.updated", "Updated") },
              ].map((h) => (
                <th
                  key={h.key}
                  className="px-3 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === undefined &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td colSpan={10} className="px-3 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}

            {rows?.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  {t(
                    "dashboard.no_vehicles_risk",
                    "No vehicles match these filters.",
                  )}
                </td>
              </tr>
            )}

            {rows?.map((vehicle) => {
              const statusTone =
                VEHICLE_STATUS_TONE[vehicle.status] ??
                VEHICLE_STATUS_TONE.idle;
              const exposureTone =
                RISK_TONE[vehicle.exposureLevel as RiskLevel];
              const selected = selectedId === vehicle._id;

              return (
                <tr
                  key={vehicle._id}
                  onClick={() => onSelect(vehicle._id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(vehicle._id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition-colors last:border-0",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    selected ? "bg-muted/50" : "hover:bg-muted/20",
                  )}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">
                    {vehicle.vehicleNumber}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {getTranslatedVehicleType(vehicle.vehicleType, t)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {getTranslatedCargo(vehicle.cargoType, t)}
                  </td>
                  <td className="px-3 py-2.5">
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
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-wider",
                        exposureTone.text,
                      )}
                    >
                      {getTranslatedRiskLevel(vehicle.exposureLevel, t)}
                    </span>
                    {vehicle.reasonCount > 0 && (
                      <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                        ({vehicle.reasonCount})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {vehicle.deliveryPriority ? (
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider",
                          vehicle.deliveryPriority === "emergency" ||
                            vehicle.deliveryPriority === "critical"
                            ? "text-[oklch(0.648_0.201_22)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {t(`deliveries.priority_${vehicle.deliveryPriority}`, vehicle.deliveryPriority)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular text-muted-foreground">
                    {Math.round(vehicle.speed)} km/h
                  </td>
                  <td className="px-3 py-2.5 text-xs">{vehicle.destination}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {vehicle.roadNumber ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {formatLocalizedTimeAgo(vehicle.lastUpdated, currentLang)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { SEVERITY_TONE, type Severity } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatLocalizedTimeAgo,
  translateActivityMessage,
  translateCategory,
  translateSeverityLabel,
} from "@/lib/i18n/briefing-translator";

type Category = "logistics" | "incident" | "risk" | "alert" | "system";

const FILTERS: Array<{ value: Category | "all"; labelKey: string; defaultLabel: string }> = [
  { value: "all", labelKey: "dashboard.all", defaultLabel: "All" },
  { value: "incident", labelKey: "dashboard.incidents", defaultLabel: "Incidents" },
  { value: "risk", labelKey: "dashboard.risk", defaultLabel: "Risk" },
  { value: "alert", labelKey: "dashboard.alerts", defaultLabel: "Alerts" },
  { value: "logistics", labelKey: "dashboard.logistics", defaultLabel: "Logistics" },
];

const CATEGORY_COLOR: Record<Category, string> = {
  logistics: "oklch(0.715 0.128 231)",
  incident: "oklch(0.727 0.163 55)",
  risk: "oklch(0.815 0.145 88)",
  alert: "oklch(0.648 0.201 22)",
  system: "oklch(0.685 0.019 245)",
};

/**
 * System activity timeline.
 *
 * Entries are written by the backend mutations themselves, so the feed
 * records what the system actually did — not what a component happened to
 * render. New events stream in through the same reactive subscription.
 */
export function ActivityTimeline({ limit = 14 }: { limit?: number }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const [filter, setFilter] = useState<Category | "all">("all");
  const entries = useQuery(api.dashboard.getActivityFeed, {
    limit,
    ...(filter === "all" ? {} : { category: filter }),
  });

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Activity className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {t("dashboard.system_activity", "System Activity")}
        </h3>
        <div className="ml-auto flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                filter === f.value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {t(f.labelKey, f.defaultLabel)}
            </button>
          ))}
        </div>
      </header>

      <div className="max-h-[420px] overflow-y-auto p-4">
        {entries === undefined && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            ))}
          </div>
        )}

        {entries?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t(
              "dashboard.no_activity",
              "No activity recorded in this category.",
            )}
          </p>
        )}

        {entries && entries.length > 0 && (
          <ol className="relative space-y-0">
            {/* Spine */}
            <span
              className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-border"
              aria-hidden
            />

            {entries.map((entry) => {
              const color =
                CATEGORY_COLOR[entry.category as Category] ??
                CATEGORY_COLOR.system;
              const severityTone = entry.severity
                ? SEVERITY_TONE[entry.severity as Severity]
                : null;

              return (
                <li key={entry._id} className="relative pb-4 pl-5 last:pb-0">
                  <span
                    className="absolute left-0 top-1.5 size-[7px] rounded-full ring-2 ring-card"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />

                  <p className="text-xs leading-relaxed text-foreground/90">
                    {translateActivityMessage(entry.message, currentLang)}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.13em]"
                      style={{ color }}
                    >
                      {translateCategory(entry.category, currentLang)}
                    </span>
                    {severityTone && (
                      <span
                        className={cn(
                          "font-mono text-[9px] uppercase tracking-wider",
                          severityTone.text,
                        )}
                      >
                        {translateSeverityLabel(
                          severityTone.label,
                          currentLang,
                        )}
                      </span>
                    )}
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {formatLocalizedTimeAgo(entry.createdAt, currentLang)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}


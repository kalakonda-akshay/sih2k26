"use client";

import { useQuery } from "convex/react";
import { Activity, Brain, Gauge, Layers, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RISK_TONE, riskLevelFromScore } from "@/lib/risk";
import { formatLocalizedTimeAgo } from "@/lib/i18n/briefing-translator";
import { cn } from "@/lib/utils";

/**
 * Page header and the four headline risk metrics.
 *
 * The status chip says "Rule engine active", not "AI engine active". The
 * engine is a transparent weighted scoring model, and labelling it as a
 * trained AI would be a claim the code does not support. The engine version
 * is shown next to it so the number on screen is always attributable.
 */
export function RiskOverview() {
  const { t, i18n } = useTranslation();
  const overview = useQuery(api.riskEngine.getRiskOverview);

  const avgTone = overview
    ? RISK_TONE[riskLevelFromScore(overview.averageRisk)]
    : null;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card">
        <div className="command-grid absolute inset-0 opacity-[0.35]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 0% 0%, oklch(0.715 0.128 231 / 0.10), transparent 55%)",
          }}
        />

        <div className="relative flex flex-col gap-5 p-5 md:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                {t("nav.risk", "Risk Intelligence")}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
              {t("dashboard.panels.risk_intelligence", "AI Risk Intelligence")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t(
                "risk.subtitle",
                "Predicting logistics and accessibility disruptions before they occur.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-[oklch(0.735_0.155_158)]/30 bg-[oklch(0.735_0.155_158)]/10 px-2.5 py-1.5 text-[oklch(0.735_0.155_158)]">
              <span className="live-dot inline-block size-1.5 shrink-0 rounded-full bg-current" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {t("risk.rule_engine_active", "Rule engine active")}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-muted-foreground">
              <Layers className="size-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {overview
                  ? `${overview.assessedLocations}/${overview.monitoredLocations} ${t("risk.locations", "locations")}`
                  : t("common.loading", "Loading")}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-muted-foreground">
              <Activity className="size-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {overview?.lastRunAt
                  ? `${t("risk.run", "Run")} ${formatLocalizedTimeAgo(overview.lastRunAt, i18n.language)}`
                  : t("risk.not_yet_run", "Not yet run")}
              </span>
            </div>
          </div>
        </div>

        <div className="relative border-t border-border px-5 py-2.5 md:px-6">
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {t("risk.scoring_note", "Transparent weighted scoring · engine {{version}} · six factors, each auditable · not a trained ML model", {
              version: overview?.engineVersion ?? "—",
            })}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t("risk.avg_regional_risk", "Average Regional Risk")}
          value={overview?.averageRisk}
          icon={Gauge}
          tone={
            overview
              ? (
                  {
                    low: "safe",
                    moderate: "moderate",
                    high: "high",
                    critical: "critical",
                  } as const
                )[riskLevelFromScore(overview.averageRisk)]
              : "neutral"
          }
          context={
            avgTone ? `${t(`risk.${avgTone.label.toLowerCase()}`, avgTone.label)} ${t("risk.across_region", "across the region")}` : undefined
          }
        />
        <MetricCard
          label={t("risk.critical_locations", "Critical Risk Locations")}
          value={overview?.criticalLocations}
          total={overview?.assessedLocations}
          icon={TriangleAlert}
          tone="critical"
          context={
            overview ? `${overview.highRiskLocations} ${t("risk.high", "high risk")}` : undefined
          }
        />
        <MetricCard
          label={t("dashboard.metrics.high_risk_roads", "High-Risk Roads")}
          value={overview?.highRiskRoads}
          total={overview?.totalRoads}
          icon={Layers}
          tone="high"
          context={overview ? t("risk.high_or_critical", "High or critical band") : undefined}
        />
        <MetricCard
          label={t("risk.predictions_generated", "Predictions Generated")}
          value={overview?.predictionsGenerated}
          icon={Brain}
          tone="neutral"
          context={
            overview ? t("risk.across_locations", "Across {{count}} locations", { count: overview.assessedLocations }) : undefined
          }
        />
      </div>
    </div>
  );
}

/** Distribution of monitored locations across the four risk bands. */
export function RiskDistribution() {
  const { t } = useTranslation();
  const overview = useQuery(api.riskEngine.getRiskOverview);
  const dist = overview?.distribution;
  const total = dist
    ? dist.low + dist.moderate + dist.high + dist.critical
    : 0;

  const rows = (
    [
      ["low", "Low", "0–25"],
      ["moderate", "Moderate", "26–50"],
      ["high", "High", "51–75"],
      ["critical", "Critical", "76–100"],
    ] as const
  ).map(([key, label, range]) => ({
    key,
    label: t(`risk.${key}`, label),
    range,
    count: dist?.[key] ?? 0,
    tone: RISK_TONE[key],
  }));

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{t("risk.distribution_title", "Regional Risk Distribution")}</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {total > 0 ? `${total} ${t("risk.monitored_locations", "monitored locations")}` : t("risk.awaiting_assessment", "Awaiting assessment")}
        </p>
      </header>

      <div className="space-y-3 p-4">
        {/* Stacked share bar */}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          {rows.map((row) => (
            <div
              key={row.key}
              style={{
                width: total > 0 ? `${(row.count / total) * 100}%` : "0%",
                backgroundColor: row.tone.hex,
              }}
              title={`${row.label}: ${row.count}`}
            />
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-2"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.tone.hex }}
              />
              <div className="min-w-0 flex-1">
                <div className={cn("text-xs font-medium", row.tone.text)}>
                  {row.label}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground">
                  {t("risk.score_range", "score {{range}}", { range: row.range })}
                </div>
              </div>
              <span className="font-mono text-sm tabular text-foreground">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

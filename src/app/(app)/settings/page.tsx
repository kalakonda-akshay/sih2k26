"use client";

import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Globe,
  Info,
  Languages,
  Server,
  Settings as SettingsIcon,
  Shield,
  User,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { UserManagement } from "@/components/settings/user-management";
import { EngineConfig } from "@/components/settings/engine-config";
import { DataManagement } from "@/components/settings/data-management";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Settings.
 *
 * Platform configuration, regional language preferences, engine controls,
 * and user management.
 */
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language?.split("-")[0] || "en") as SupportedLanguageCode;
  const currentUser = useQuery(api.users.getCurrentUser);
  const metrics = useQuery(api.dashboard.getMetrics);

  const convexHost = process.env.NEXT_PUBLIC_CONVEX_URL
    ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).host
    : null;

  const handleSelectLanguage = (code: string) => {
    void i18n.changeLanguage(code);
  };

  const selectedMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
      {/* Header */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card">
        <div className="command-grid absolute inset-0 opacity-[0.35]" />
        <div className="relative flex flex-col gap-4 p-5 md:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SettingsIcon className="size-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                Configuration
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {t("settings.title", "Settings")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t(
                "settings.subtitle",
                "Platform configuration, user profile and language preferences",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Language Section */}
      <section className="rounded-lg border border-border bg-card p-5 md:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-border bg-accent/40 text-primary">
            <Languages className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">
              {t("settings.language_section", "Regional Language Preferences")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "settings.language_description",
                "Select your preferred regional language for the NER-Vision command centre interface. Text updates immediately.",
              )}
            </p>
          </div>
        </div>

        {/* Status Callout */}
        <div className="mt-4 flex items-start gap-3 rounded-md border border-border/80 bg-accent/20 p-3.5 text-xs">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {t("settings.current_language", "Current Language")}:{" "}
              <span className="text-primary font-semibold">
                {selectedMeta.nativeName} ({selectedMeta.name})
              </span>{" "}
              — {selectedMeta.script} script
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {selectedMeta.group === "B"
                ? t(
                    "settings.group_b_notice",
                    "Group B: Native speaker translation in progress. Falling back to English.",
                  )
                : selectedMeta.group === "A"
                  ? t(
                      "settings.group_a_notice",
                      "Group A: Machine translation draft enabled. Community review welcomed.",
                    )
                  : "Base system language: English (United States). Fully verified."}
            </p>
          </div>
        </div>

        {/* Language Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-xs"
                    : "border-border bg-card/60 hover:bg-accent/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {lang.nativeName}
                    </span>
                    {lang.group === "B" && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        En fallback
                      </span>
                    )}
                    {lang.group === "A" && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                        Draft MT
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{lang.name}</span>
                    <span>·</span>
                    <span className="font-mono text-[10px]">{lang.code}</span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-5 shrink-0 rounded-full border border-border" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Role & Access Section */}
      <section className="rounded-lg border border-border bg-card p-5 md:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-border bg-accent/40 text-primary">
            <Shield className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">
              {t("settings.role_management", "Role Management & Access Control")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "settings.role_description",
                "Field Officer, Operator and Regional Command permissions.",
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-border bg-accent/20 p-4">
          {(() => {
            const rawName = currentUser?.name?.trim();
            const emailName = currentUser?.email
              ? currentUser.email.split("@")[0].replace(/[._-]/g, " ")
              : "";
            const formattedEmailName = emailName
              ? emailName
                  .split(" ")
                  .filter(Boolean)
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(" ")
              : "";

            const displayName = rawName || formattedEmailName || "Col. Rajesh Sharma";
            const displayRole = currentUser?.role
              ? currentUser.role.replace(/_/g, " ")
              : "Operations Commander";

            const initials =
              displayName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase() || "RS";

            return (
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-sm font-bold text-primary border border-primary/30">
                  {initials}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {displayName}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {displayRole} ·{" "}
                    {currentUser?.organization ?? "MDoNER Regional Command"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {currentUser?.email ?? "admin@ner-vision.gov.in"} · {currentUser?.district ?? "NER Central"}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Engine & Data Management */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <UserManagement />
        </div>
        <div className="space-y-4">
          <DataManagement />

          {/* System */}
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Server className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">System</h3>
            </header>

            <dl className="divide-y divide-border">
              <Row label="Backend" value="Convex" />
              <Row label="Deployment" value={convexHost ?? "not connected"} />
              <Row
                label="Live records"
                value={
                  metrics
                    ? `${metrics.totalVehicles} vehicles · ${metrics.totalRoads} roads`
                    : "…"
                }
              />
              <Row
                label="Network health"
                value={metrics ? `${metrics.networkHealth}%` : "…"}
              />
              <Row label="Frontend" value="Next.js 16 · React 19" />
              <Row label="Mapping" value="Leaflet · Esri Dark Gray Canvas" />
              <Row label="Real-time" value="Convex reactive queries" />
            </dl>

            <p className="border-t border-border bg-background/40 px-4 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
              The AI layer is optional and configured through Convex
              environment variables on the server. No API key is ever read in
              the browser; without one the assistant runs on its rule engine.
            </p>
          </section>
        </div>
      </div>

      <EngineConfig />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 px-4 py-2.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </dt>
      <dd className="ml-auto truncate text-right font-mono text-xs">{value}</dd>
    </div>
  );
}

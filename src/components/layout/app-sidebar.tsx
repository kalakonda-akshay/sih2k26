"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import {
  BellRing,
  Bot,
  ChartColumnBig,
  LayoutDashboard,
  Map as MapIcon,
  Route as RouteIcon,
  PackageCheck,
  Radio,
  Settings,
  Siren,
  Smartphone,
  Sparkles,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  i18nKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Which live counter, if any, appears as a badge. */
  badge?: "alerts" | "incidents";
  badgeText?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", i18nKey: "nav.dashboard", icon: LayoutDashboard },
  {
    href: "/war-room",
    label: "War-Room Command",
    i18nKey: "nav.war_room",
    icon: Radio,
    badgeText: "DEFCON",
  },
  { href: "/map", label: "Live Intelligence Map", i18nKey: "nav.map", icon: MapIcon },
  { href: "/routes", label: "Route Intelligence", i18nKey: "nav.routes", icon: RouteIcon },
  { href: "/risk-intelligence", label: "AI Risk Intelligence", i18nKey: "nav.risk", icon: Sparkles },
  { href: "/vehicles", label: "Vehicle Tracking", i18nKey: "nav.vehicles", icon: Truck },
  { href: "/deliveries", label: "Deliveries", i18nKey: "nav.deliveries", icon: PackageCheck },
  {
    href: "/incidents",
    label: "Incident Center",
    i18nKey: "nav.incidents",
    icon: TriangleAlert,
    badge: "incidents",
  },
  { href: "/alerts", label: "Alert Center", i18nKey: "nav.alerts", icon: BellRing, badge: "alerts" },
  { href: "/analytics", label: "Analytics", i18nKey: "nav.analytics", icon: ChartColumnBig },
  { href: "/emergency", label: "Emergency Mode", i18nKey: "nav.emergency", icon: Siren },
  { href: "/assistant", label: "Operations Assistant", i18nKey: "nav.assistant", icon: Bot },
  { href: "/field", label: "Field Operations", i18nKey: "nav.field", icon: Smartphone },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const metrics = useQuery(api.dashboard.getMetrics);
  const currentUser = useQuery(api.users.getCurrentUser);

  const badgeValue = (badge: NavItem["badge"]) => {
    if (!badge || !metrics) return null;
    const value =
      badge === "alerts" ? metrics.activeAlerts : metrics.activeIncidents;
    return value > 0 ? value : null;
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent">
          <Siren className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">
            {t("brand.name", "NER-Vision AI")}
          </div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t("brand.tagline", "Predict · Navigate · Deliver")}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t("nav.operations", "Operations")}
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const badge = badgeValue(item.badge);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  {/* Active rail */}
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="truncate">{t(item.i18nKey, item.label)}</span>
                  {badge !== null && (
                    <span
                      className={cn(
                        "ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] tabular",
                        item.badge === "alerts"
                          ? "bg-[oklch(0.648_0.201_22)]/15 text-[oklch(0.648_0.201_22)]"
                          : "bg-[oklch(0.727_0.163_55)]/15 text-[oklch(0.727_0.163_55)]",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                  {item.badgeText && (
                    <span className="ml-auto rounded px-1.5 py-0.2 font-mono text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                      {item.badgeText}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Settings className="size-4" />
          {t("nav.settings", "Settings")}
        </Link>

        <div className="mt-2 flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
            {currentUser?.name
              ? currentUser.name
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()
              : "··"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">
              {currentUser?.name ?? t("common.loading", "Loading…")}
            </div>
            <div className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {currentUser?.role?.replace(/_/g, " ") ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

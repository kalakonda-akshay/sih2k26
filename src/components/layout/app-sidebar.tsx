"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  BellRing,
  Bot,
  ChartColumnBig,
  LayoutDashboard,
  Map as MapIcon,
  Route as RouteIcon,
  PackageCheck,
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
  icon: React.ComponentType<{ className?: string }>;
  /** Which live counter, if any, appears as a badge. */
  badge?: "alerts" | "incidents";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Live Intelligence Map", icon: MapIcon },
  { href: "/routes", label: "Route Intelligence", icon: RouteIcon },
  { href: "/risk-intelligence", label: "AI Risk Intelligence", icon: Sparkles },
  { href: "/vehicles", label: "Vehicle Tracking", icon: Truck },
  { href: "/deliveries", label: "Deliveries", icon: PackageCheck },
  {
    href: "/incidents",
    label: "Incident Center",
    icon: TriangleAlert,
    badge: "incidents",
  },
  { href: "/alerts", label: "Alert Center", icon: BellRing, badge: "alerts" },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig },
  { href: "/emergency", label: "Emergency Mode", icon: Siren },
  { href: "/assistant", label: "Operations Assistant", icon: Bot },
  { href: "/field", label: "Field Operations", icon: Smartphone },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
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
            NER-Vision AI
          </div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Predict · Navigate · Deliver
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Operations
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
                  <span className="truncate">{item.label}</span>
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
          Settings
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
              {currentUser?.name ?? "Loading…"}
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

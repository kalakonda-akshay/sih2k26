"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { Bell, Menu, Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { NAV_ITEMS } from "./app-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { SEVERITY_TONE, type Severity } from "@/lib/risk";

export function TopNavbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const metrics = useQuery(api.dashboard.getMetrics);
  const alerts = useQuery(api.alerts.listActiveAlerts, { limit: 6 });
  const currentUser = useQuery(api.users.getCurrentUser);

  const active = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const title =
    active?.label ?? (pathname === "/settings" ? "Settings" : "NER-Vision AI");

  // Data flowing means the websocket is live; undefined means still connecting.
  const connected = metrics !== undefined;
  const alertCount = metrics?.activeAlerts ?? 0;

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "··";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
        <div className="hidden items-center gap-2 sm:flex">
          <span
            className={cn(
              "live-dot inline-block size-1.5 rounded-full",
              connected
                ? "bg-[oklch(0.735_0.155_158)] text-[oklch(0.735_0.155_158)]"
                : "bg-[oklch(0.815_0.145_88)] text-[oklch(0.815_0.145_88)]",
            )}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            NER Intelligence Network · {connected ? "Live" : "Connecting"}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="ml-auto hidden max-w-xs flex-1 lg:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vehicles, roads, districts…"
            aria-label="Search"
            className="h-9 bg-card pl-9 text-sm"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        {/* Network health */}
        <div className="mr-1 hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 xl:flex">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Network
          </span>
          <span className="font-mono text-xs font-semibold tabular text-[oklch(0.735_0.155_158)]">
            {metrics ? `${metrics.networkHealth}%` : "—"}
          </span>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`Notifications: ${alertCount} active`}
              />
            }
          >
            <Bell className="size-5" />
            {alertCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[oklch(0.648_0.201_22)] font-mono text-[9px] font-bold tabular text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            {/*
              Base UI renders DropdownMenuLabel as Menu.GroupLabel, which
              throws unless it has a Menu.Group ancestor — unlike Radix, where
              a bare label is valid. The wrapper is required, not cosmetic.
            */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Active alerts</span>
                <span className="font-mono text-xs tabular text-muted-foreground">
                  {alertCount}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            {alerts === undefined && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                Loading…
              </div>
            )}
            {alerts?.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                No active alerts.
              </div>
            )}

            {alerts?.map((alert) => {
              const tone = SEVERITY_TONE[alert.severity as Severity];
              return (
                <DropdownMenuItem
                  key={alert._id}
                  render={<Link href="/alerts" />}
                  className="flex-col items-start gap-1"
                >
                  <span className="flex w-full items-start gap-2">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tone.hex }}
                    />
                    <span className="flex-1 text-xs leading-snug">
                      {alert.title}
                    </span>
                  </span>
                  <span className="pl-3.5 font-mono text-[10px] text-muted-foreground">
                    {alert.locationName ?? "Region"} ·{" "}
                    {timeAgo(alert.createdAt)}
                  </span>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/alerts" />}
              className="justify-center text-xs"
            >
              View alert centre
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="gap-2 px-2"
                aria-label="User menu"
              />
            }
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-semibold text-primary">
              {initials}
            </span>
            <span className="hidden text-sm md:inline">
              {currentUser?.name?.split(" ")[0] ?? "User"}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm">
                  {currentUser?.name ?? "—"}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {currentUser?.role?.replace(/_/g, " ") ?? "—"}
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                  {currentUser?.organization ?? ""}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

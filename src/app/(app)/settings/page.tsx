"use client";

import { useQuery } from "convex/react";
import { CircleUser, Server, Settings as SettingsIcon } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { UserManagement } from "@/components/settings/user-management";
import { EngineConfig } from "@/components/settings/engine-config";
import { DataManagement } from "@/components/settings/data-management";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Settings.
 *
 * Everything on this page reads or writes real records. There are no toggles
 * that do nothing: where a capability is not implemented — authentication,
 * for one — the panel says so plainly instead of offering a switch that has
 * no effect.
 */
export default function SettingsPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const metrics = useQuery(api.dashboard.getMetrics);

  // The deployment URL is a public identifier, not a secret. No key is ever
  // read in the browser — AI credentials live in Convex env vars, server-side.
  const convexHost = process.env.NEXT_PUBLIC_CONVEX_URL
    ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).host
    : null;

  return (
    <div className="space-y-4 p-4 md:p-6">
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
              Settings
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Accounts, intelligence-engine configuration and the demonstration
              dataset.
            </p>
          </div>

          {/* Signed-in identity */}
          <div className="flex items-center gap-3 rounded-md border border-border bg-background/60 px-3 py-2.5">
            <CircleUser className="size-8 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              {currentUser === undefined ? (
                <>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </>
              ) : (
                <>
                  <div className="truncate text-sm font-medium">
                    {currentUser?.name ?? "No account"}
                  </div>
                  <div className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {currentUser?.role?.replace(/_/g, " ") ?? "—"}
                    {currentUser?.district ? ` · ${currentUser.district}` : ""}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="relative border-t border-border px-5 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground md:px-6">
          No authentication provider is configured, so the account shown is the
          seeded administrator rather than a signed-in user.
        </p>
      </section>

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

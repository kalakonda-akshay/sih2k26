import type { Metadata } from "next";
import { HeroStatus } from "@/components/dashboard/hero-status";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { IntelligenceMap } from "@/components/map/intelligence-map";
import { AlertPanel } from "@/components/dashboard/alert-panel";
import { VehicleMonitor } from "@/components/dashboard/vehicle-monitor";
import { IncidentList } from "@/components/dashboard/incident-list";
import { RiskIntelligence } from "@/components/dashboard/risk-intelligence";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DemoControls } from "@/components/dashboard/demo-controls";
import { SituationBriefing } from "@/components/briefing/situation-briefing";

export const metadata: Metadata = {
  title: "Command Dashboard — NER-Vision AI",
};

/**
 * The AI Command Center.
 *
 * Every panel subscribes to Convex independently, so a single mutation
 * anywhere in the system fans out to exactly the panels that care.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <HeroStatus />

      <MetricsGrid />

      <SituationBriefing />

      {/* Map is the primary visual; alerts sit beside it on wide screens. */}
      <div className="grid gap-4 xl:grid-cols-3">
        <IntelligenceMap compact className="xl:col-span-2" />
        <AlertPanel limit={5} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <RiskIntelligence limit={3} />
        <VehicleMonitor limit={6} />
        <IncidentList limit={6} />
      </div>

      <ActivityTimeline limit={16} />

      <DemoControls />
    </div>
  );
}

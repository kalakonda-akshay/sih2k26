"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  RiskOverview,
  RiskDistribution,
} from "@/components/risk/risk-overview";
import { CriticalRiskList } from "@/components/risk/critical-risk-list";
import { RiskExplanation } from "@/components/risk/risk-explanation";
import { HighRiskRoads } from "@/components/risk/high-risk-roads";
import { DemoControls } from "@/components/dashboard/demo-controls";

/**
 * AI Risk Intelligence.
 *
 * Selecting a prediction on the left drives the explainability panel on the
 * right. Every panel subscribes to Convex independently, so a rainfall update
 * or a new incident re-scores the region and this page follows without a
 * refresh.
 */
export default function RiskIntelligencePage() {
  const [selected, setSelected] = useState<Id<"riskPredictions"> | null>(null);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <RiskOverview />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <CriticalRiskList selectedId={selected} onSelect={setSelected} />
        </div>
        <div className="space-y-4 xl:col-span-3">
          <RiskExplanation predictionId={selected} />
          <RiskDistribution />
        </div>
      </div>

      <HighRiskRoads limit={10} />

      <DemoControls />
    </div>
  );
}

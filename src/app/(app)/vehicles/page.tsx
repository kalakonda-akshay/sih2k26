"use client";

import { useCallback, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VehicleOverview } from "@/components/vehicles/vehicle-overview";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { VehicleDetails } from "@/components/vehicles/vehicle-details";
import { HighRiskVehicles } from "@/components/vehicles/high-risk-vehicles";
import { FleetSimulation } from "@/components/vehicles/fleet-simulation";
import { IntelligenceMap } from "@/components/map/intelligence-map";
import type { FocusTarget } from "@/components/map/types";

/**
 * Smart Vehicle Tracking.
 *
 * Reuses the Live Intelligence Map rather than building a second map: the
 * same component, driven here by an external focus target so selecting a
 * vehicle re-centres the shared canvas.
 */
export default function VehiclesPage() {
  const [selected, setSelected] = useState<Id<"vehicles"> | null>(null);
  const [focus, setFocus] = useState<FocusTarget | null>(null);

  const focusOn = useCallback((lat: number, lng: number) => {
    // A fresh key on every request makes repeat clicks re-centre the map.
    setFocus({ lat, lng, zoom: 10, key: Date.now() });
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <VehicleOverview />

      <FleetSimulation />

      <div className="grid gap-4 xl:grid-cols-3">
        <IntelligenceMap
          compact
          className="xl:col-span-2"
          externalFocus={focus}
        />
        <HighRiskVehicles onSelect={setSelected} limit={8} />
      </div>

      <VehicleTable onSelect={setSelected} selectedId={selected} />

      <VehicleDetails
        vehicleId={selected}
        onClose={() => setSelected(null)}
        onFocusMap={focusOn}
      />
    </div>
  );
}

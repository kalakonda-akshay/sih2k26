"use client";

import { useCallback, useState } from "react";
import { RouteSearch, type Priority } from "@/components/routes/route-search";
import { RouteOptions } from "@/components/routes/route-options";
import { RouteComparison } from "@/components/routes/route-comparison";
import { RouteDisruptions } from "@/components/routes/route-disruptions";
import { IntelligenceMap } from "@/components/map/intelligence-map";
import { DemoControls } from "@/components/dashboard/demo-controls";

/**
 * Route Intelligence.
 *
 * Corridor-level path selection over the monitored road network. Selecting an
 * option highlights its segments on the shared Live Intelligence Map rather
 * than rendering a second map — same component, driven by `highlightRoadIds`.
 */
export default function RoutesPage() {
  const [origin, setOrigin] = useState("Guwahati");
  const [destination, setDestination] = useState("Shillong");
  const [priority, setPriority] = useState<Priority>("critical");
  const [selectedRank, setSelectedRank] = useState(0);
  const [highlightRoadIds, setHighlightRoadIds] = useState<string[]>([]);

  const onSearchChange = useCallback(
    (next: { origin: string; destination: string; priority: Priority }) => {
      setOrigin(next.origin);
      setDestination(next.destination);
      setPriority(next.priority);
      // A new search invalidates the previous selection.
      setSelectedRank(0);
      setHighlightRoadIds([]);
    },
    [],
  );

  const onSelectOption = useCallback((rank: number, roadIds: string[]) => {
    setSelectedRank(rank);
    setHighlightRoadIds(roadIds);
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <RouteSearch
        origin={origin}
        destination={destination}
        priority={priority}
        onChange={onSearchChange}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <RouteOptions
            origin={origin}
            destination={destination}
            priority={priority}
            selectedRank={selectedRank}
            onSelect={onSelectOption}
          />
        </div>

        <div className="space-y-4">
          <IntelligenceMap compact highlightRoadIds={highlightRoadIds} />
          <RouteComparison
            origin={origin}
            destination={destination}
            priority={priority}
          />
        </div>
      </div>

      <RouteDisruptions onSelectRoute={setHighlightRoadIds} />

      <DemoControls />
    </div>
  );
}

import type { Metadata } from "next";
import { IncidentList } from "@/components/dashboard/incident-list";
import { IntelligenceMap } from "@/components/map/intelligence-map";

export const metadata: Metadata = {
  title: "Incident Center — NER-Vision AI",
};

export default function IncidentsPage() {
  return (
    <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-3">
      <IncidentList limit={25} />
      <IntelligenceMap compact className="lg:col-span-2" />
    </div>
  );
}

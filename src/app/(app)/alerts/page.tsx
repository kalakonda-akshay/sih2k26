import type { Metadata } from "next";
import { AlertPanel } from "@/components/dashboard/alert-panel";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";

export const metadata: Metadata = {
  title: "Alert Center — NER-Vision AI",
};

export default function AlertsPage() {
  return (
    <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-2">
      <AlertPanel limit={25} />
      <ActivityTimeline limit={30} />
    </div>
  );
}

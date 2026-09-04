import type { Metadata } from "next";
import { IntelligenceMap } from "@/components/map/intelligence-map";

export const metadata: Metadata = {
  title: "Live Intelligence Map — NER-Vision AI",
};

/**
 * Full-height geospatial intelligence view. The shell's header is 4rem, so
 * the map claims the rest of the viewport rather than sitting in a scrolling
 * page — a command map you have to scroll to is a command map you don't use.
 */
export default function MapPage() {
  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-6">
      <IntelligenceMap className="h-full" />
    </div>
  );
}

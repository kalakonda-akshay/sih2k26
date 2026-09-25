import type { Metadata } from "next";
import { WarRoomView } from "@/components/war-room/war-room-view";

export const metadata: Metadata = {
  title: "War-Room Command Operations — NER-Vision AI",
  description:
    "Defense-grade joint emergency operations center for North East strategic logistics.",
};

/**
 * Dedicated Full-Screen War-Room Operations Center.
 * Operates in fixed viewport mode to provide maximum tactical radar visibility
 * across all 8 North East Region states.
 */
export default function WarRoomPage() {
  return (
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#06090f]">
      <WarRoomView />
    </div>
  );
}

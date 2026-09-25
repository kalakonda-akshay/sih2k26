"use client";

import { WarRoomView } from "./war-room-view";

export function WarRoomModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#06090e] text-foreground select-none overflow-hidden animate-in fade-in duration-200">
      <WarRoomView isModal onExit={onClose} />
    </div>
  );
}

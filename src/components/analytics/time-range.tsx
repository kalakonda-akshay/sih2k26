"use client";

import { cn } from "@/lib/utils";

export type TimeWindow = "24h" | "7d" | "30d";

export const TIME_WINDOWS: Array<{ value: TimeWindow; label: string }> = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

/**
 * Window selector.
 *
 * The choice is passed to every analytics query, so switching it genuinely
 * re-queries rather than re-labelling the same snapshot.
 */
export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Analytics time range"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-1"
    >
      {TIME_WINDOWS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.value}
          </button>
        );
      })}
    </div>
  );
}

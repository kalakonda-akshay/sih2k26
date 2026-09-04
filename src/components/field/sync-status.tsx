"use client";

import { CloudUpload, Inbox, Loader2, TriangleAlert } from "lucide-react";
import { useOfflineQueue } from "./use-offline-queue";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pending report queue.
 *
 * Rendered only when something is actually waiting, so a clean device shows
 * nothing rather than an empty tray. The wording keeps "waiting to send"
 * strictly apart from "filed" — a queued report has not reached the command
 * centre, and an officer must never be left believing otherwise.
 */
export function SyncStatus({ className }: { className?: string }) {
  const { pending, drain, deliver } = useOfflineQueue();

  const draining = drain.state === "draining";
  if (pending === 0 && !draining && drain.state !== "done") return null;

  if (pending === 0 && drain.state === "done" && drain.delivered > 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/8 px-3 py-2.5",
          className,
        )}
      >
        <p className="text-[12px] leading-snug text-[oklch(0.735_0.155_158)]">
          {drain.delivered} queued report
          {drain.delivered === 1 ? "" : "s"} delivered to the command centre.
        </p>
      </div>
    );
  }

  if (pending === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-[oklch(0.815_0.145_88)]/35 bg-[oklch(0.815_0.145_88)]/8 p-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Inbox className="mt-0.5 size-4 shrink-0 text-[oklch(0.815_0.145_88)]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-[oklch(0.815_0.145_88)]">
            {pending} report{pending === 1 ? "" : "s"} waiting to send
          </h3>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            Saved on this device. {pending === 1 ? "It has" : "They have"} not
            reached the command centre yet — delivery happens automatically
            when the connection returns.
          </p>

          {drain.state === "error" && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-[oklch(0.648_0.201_22)]">
              <TriangleAlert className="mt-px size-3 shrink-0" />
              {drain.message}
            </p>
          )}

          <Button
            size="sm"
            variant="outline"
            className="mt-2.5 h-9 w-full gap-2 text-xs"
            disabled={draining}
            onClick={() => void deliver()}
          >
            {draining ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Sending {drain.done + 1} of {drain.total}…
              </>
            ) : (
              <>
                <CloudUpload className="size-3.5" />
                Try sending now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline — NER-Vision AI" };

/**
 * Shown by the service worker when a navigation fails and nothing suitable
 * is cached. It states exactly what is and is not available rather than
 * offering a Retry button that may do nothing.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <CloudOff className="size-6 text-[oklch(0.815_0.145_88)]" />
        <h1 className="mt-3 text-lg font-semibold">No connection</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This screen needs live data from the intelligence network, and the
          device is offline.
        </p>

        <div className="mt-4 rounded-md border border-border bg-background/60 p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Available offline
          </div>
          <ul className="mt-1.5 flex flex-col gap-1 text-[11px] leading-relaxed text-muted-foreground">
            <li>· Any screen you have already opened on this device</li>
            <li>· Your saved incident draft, restored when you return</li>
            <li>· Previously viewed map tiles</li>
          </ul>
        </div>

        <div className="mt-3 rounded-md border border-[oklch(0.815_0.145_88)]/30 bg-[oklch(0.815_0.145_88)]/8 p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[oklch(0.815_0.145_88)]">
            Needs a connection
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[oklch(0.815_0.145_88)]">
            Submitting a report. Your draft is safe on this device, but it is
            not sent until the network returns — the app will never tell you a
            report went through when it did not.
          </p>
        </div>

        <Link
          href="/field"
          className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-muted/40 text-xs font-medium transition-colors hover:bg-muted"
        >
          Back to Field Operations
        </Link>
      </div>
    </div>
  );
}

"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

/**
 * Convex client provider.
 *
 * `NEXT_PUBLIC_CONVEX_URL` is written by `npx convex dev` into `.env.local`.
 * It is a public deployment URL, not a secret — no key is ever exposed here.
 *
 * If the variable is missing the app renders a setup panel rather than
 * throwing an unhandled error on the first `useQuery`, so a fresh clone gives
 * a readable instruction instead of a blank screen.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!client) return <ConvexSetupNotice />;

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

function ConvexSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[oklch(0.815_0.145_88)]">
          Setup required
        </div>
        <h1 className="mt-3 text-xl font-semibold">
          Convex deployment not linked
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_CONVEX_URL
          </code>{" "}
          is not set. Run the following once in the project root — it links
          your Convex project, generates{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            convex/_generated
          </code>
          , pushes the schema and writes the variable into{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            .env.local
          </code>
          .
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs">
          npx convex dev
        </pre>
        <p className="mt-4 text-xs text-muted-foreground">
          Then load the demo data from the Convex dashboard by running the{" "}
          <code className="rounded bg-muted px-1 py-0.5">seed:seedDemoData</code>{" "}
          mutation, or from this app once it connects.
        </p>
      </div>
    </div>
  );
}

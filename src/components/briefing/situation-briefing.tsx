"use client";

import { useQuery } from "convex/react";
import { Eye, FileText, ListChecks, TriangleAlert, Zap } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const SEVERITY_HEX: Record<string, string> = {
  critical: "oklch(0.648 0.201 22)",
  high: "oklch(0.727 0.163 55)",
  medium: "oklch(0.815 0.145 88)",
  low: "oklch(0.685 0.019 245)",
};

/**
 * Situation briefing.
 *
 * Four sections, deliberately kept structurally separate: what is observed,
 * what is forecast, what is disrupted, and what is proposed. Blending those
 * into one narrative is how a briefing turns a prediction into an apparent
 * fact, so the headings do the work of keeping them apart.
 *
 * Composed by `briefing.getSituationBriefing` from the existing engines — no
 * language model is involved, and the footer says so.
 */
export function SituationBriefing({ className }: { className?: string }) {
  const briefing = useQuery(api.briefing.getSituationBriefing);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Situation Briefing</h3>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {briefing ? briefing.headline : "Composing…"}
          </p>
        </div>
        {briefing && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
            {timeAgo(briefing.generatedAt)}
          </span>
        )}
      </header>

      {briefing === undefined && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {briefing && (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <Section
            icon={Eye}
            title="Current situation"
            subtitle="Observed"
            tone="text-[oklch(0.735_0.155_158)]"
            lines={briefing.observations}
          />
          <Section
            icon={TriangleAlert}
            title="Key risks"
            subtitle="Predicted — not confirmed"
            tone="text-[oklch(0.815_0.145_88)]"
            lines={briefing.risks}
          />
          <Section
            icon={Zap}
            title="Affected operations"
            subtitle="Observed"
            tone="text-[oklch(0.727_0.163_55)]"
            lines={briefing.affected}
          />
          <Section
            icon={ListChecks}
            title="Recommended actions"
            subtitle="Awaiting approval"
            tone="text-[oklch(0.715_0.128_231)]"
            lines={briefing.recommendations}
          />
        </div>
      )}

      {briefing && (
        <p className="border-t border-border bg-background/40 px-4 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Composed by {briefing.method} from live records. Observations are
          facts; risks are rule-engine forecasts; recommendations require human
          approval. No language model is involved.
        </p>
      )}
    </section>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  tone,
  lines,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: string;
  lines: Array<{ text: string; entity?: string; severity?: string }>;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", tone)} />
        <h4 className={cn("text-xs font-semibold", tone)}>{title}</h4>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          · {subtitle}
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: line.severity
                  ? SEVERITY_HEX[line.severity]
                  : "oklch(0.685 0.019 245)",
              }}
              aria-hidden
            />
            <span className="text-[11.5px] leading-relaxed text-foreground/85">
              {line.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useQuery } from "convex/react";
import {
  CircleAlert,
  Eye,
  ListChecks,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const ENTITY_LABEL: Record<string, string> = {
  district: "District",
  road: "Road",
  vehicle: "Vehicle",
  delivery: "Delivery",
  incident: "Incident",
  alert: "Alert",
};

/**
 * One question and its answer.
 *
 * Each exchange holds its own live subscription, so an answer given two
 * minutes ago updates if the underlying situation changes. That is the right
 * behaviour for an operations console: a stale answer on screen is worse than
 * no answer.
 *
 * The three statement types are rendered under separate headings —
 * observations (fact), risks (forecast), recommendations (proposed action) —
 * because merging them into prose is how a briefing misleads.
 */
export type AnswerShape = NonNullable<
  ReturnType<typeof useQuery<typeof api.assistant.ask>>
>;

export function AssistantAnswer({ question }: { question: string }) {
  const { t } = useTranslation();
  const answer = useQuery(api.assistant.ask, { question });

  return (
    <div className="space-y-3">
      {/* Question */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm border border-border bg-muted/50 px-3.5 py-2.5">
          <p className="text-sm">{question}</p>
        </div>
      </div>

      {/* Answer */}
      <div className="flex justify-start">
        <div className="w-full max-w-[95%] overflow-hidden rounded-lg rounded-bl-sm border border-border bg-card">
          {answer === undefined && (
            <div className="flex items-center gap-2 p-4 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="font-mono text-xs uppercase tracking-wider">
                {t("assistant.querying", "Querying intelligence system")}
              </span>
            </div>
          )}

          {answer && <AnswerBody answer={answer} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders one answer. Shared by the reactive (rule-engine) path and the
 * action-based AI path so both look identical — the only visible difference
 * is the provenance line in the footer.
 */
export function AnswerBody({
  answer,
  snapshot = false,
}: {
  answer: AnswerShape;
  /** True when the answer cannot update itself (the AI action path). */
  snapshot?: boolean;
}) {
  const { t } = useTranslation();

  const getEntityLabel = (kind: string) => {
    switch (kind) {
      case "district":
        return t("incidents.district", "District");
      case "road":
        return t("map.layer_roads", "Road");
      case "vehicle":
        return t("map.layer_vehicles", "Vehicle");
      case "delivery":
        return t("deliveries.title", "Delivery");
      case "incident":
        return t("map.layer_incidents", "Incident");
      case "alert":
        return t("dashboard.alerts", "Alert");
      default:
        return kind;
    }
  };

  return (
    <>
      <div
        className={cn(
          "border-b border-border px-4 py-3",
          answer.intent === "unsupported" && "bg-[oklch(0.815_0.145_88)]/8",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {answer.intent === "unsupported"
              ? t("assistant.not_recognised", "Not recognised")
              : answer.intent.replace(/_/g, " ")}
          </span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {answer.confidence > 0
              ? `${answer.confidence}% ${t("assistant.match", "match")}`
              : t("assistant.no_match", "no match")}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed">
          {answer.answer}
        </p>
      </div>

      {answer.observations.length > 0 && (
        <Group
          icon={Eye}
          title={t("assistant.observed", "Observed")}
          subtitle={t("assistant.observed_sub", "Read directly from the database")}
          tone="text-[oklch(0.735_0.155_158)]"
          items={answer.observations}
        />
      )}

      {answer.risks.length > 0 && (
        <Group
          icon={TriangleAlert}
          title={t("assistant.predicted", "Predicted")}
          subtitle={t("assistant.predicted_sub", "Forecast — not a confirmed event")}
          tone="text-[oklch(0.815_0.145_88)]"
          items={answer.risks}
        />
      )}

      {answer.recommendations.length > 0 && (
        <Group
          icon={ListChecks}
          title={t("assistant.recommended", "Recommended")}
          subtitle={t("assistant.recommended_sub", "Proposed action, awaiting your approval")}
          tone="text-[oklch(0.715_0.128_231)]"
          items={answer.recommendations}
        />
      )}

      {answer.affectedEntities.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {t("assistant.referenced_records", "Referenced records")}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {answer.affectedEntities.map((entity, i) => (
              <span
                key={`${entity.kind}-${entity.label}-${i}`}
                className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                title={entity.detail}
              >
                {getEntityLabel(entity.kind)}: {entity.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border bg-background/40 px-4 py-2.5">
        <div className="flex items-start gap-1.5">
          <CircleAlert className="mt-px size-3 shrink-0 text-muted-foreground" />
          <ul className="flex flex-col gap-0.5">
            <li className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {answer.source === "llm"
                ? t("assistant.llm_source", "Generated by a language model from a bounded context.")
                : t("assistant.rule_source", "Determined by operational rules; no generative AI involved.")}
            </li>
            <li className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {snapshot
                ? t("assistant.snapshot_note", "Static snapshot taken at question time. Re-ask to refresh.")
                : t("assistant.live_note", "Live answer. Updates automatically as database records change.")}
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

function Group({
  icon: Icon,
  title,
  subtitle,
  tone,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: string;
  items: string[];
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <Icon className={cn("size-3.5", tone)} />
        <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-wider", tone)}>
          {title}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          · {subtitle}
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 px-4 py-2 text-xs leading-relaxed"
          >
            <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

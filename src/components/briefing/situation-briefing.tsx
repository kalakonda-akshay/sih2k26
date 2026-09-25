"use client";

import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { Eye, FileText, ListChecks, TriangleAlert, Zap } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { translateBriefingLine, translateHeadline } from "@/lib/i18n/briefing-translator";

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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "en";
  const briefing = useQuery(api.briefing.getSituationBriefing);

  const headline = briefing
    ? translateHeadline(briefing.headline, currentLang)
    : t("briefing.composing", "Composing…");

  const subtitleObserved = currentLang === "hi" ? "प्रेक्षित" : currentLang === "as" ? "পৰ্যবেক্ষিত" : currentLang === "mni" ? "য়েংশিনবা" : currentLang === "ne" ? "अवलोकन गरिएको" : "Observed";
  const subtitlePredicted = currentLang === "hi" ? "पूर्वानुमानित" : currentLang === "as" ? "পূৰ্বানুমানিত" : currentLang === "mni" ? "পূর্বাভাষ তৌরবা" : currentLang === "ne" ? "पूर्वानुमान गरिएको" : "Predicted";
  const subtitleAwaiting = currentLang === "hi" ? "स्वीकृति प्रतीक्षित" : currentLang === "as" ? "অনুমোদনৰ অপেক্ষাত" : currentLang === "mni" ? "অনুমতি ঙাইরিবা" : currentLang === "ne" ? "स्वीकृतिको पर्खाइमा" : "Awaiting approval";

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
          <h3 className="text-sm font-semibold">
            {t("briefing.title", "Situation Briefing")}
          </h3>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {headline}
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
            title={t("briefing.observations", "Current situation")}
            subtitle={subtitleObserved}
            tone="text-[oklch(0.735_0.155_158)]"
            lines={briefing.observations}
            lng={currentLang}
          />
          <Section
            icon={TriangleAlert}
            title={t("briefing.forecast", "Key risks")}
            subtitle={subtitlePredicted}
            tone="text-[oklch(0.815_0.145_88)]"
            lines={briefing.risks}
            lng={currentLang}
          />
          <Section
            icon={Zap}
            title={t("briefing.disruptions", "Affected operations")}
            subtitle={subtitleObserved}
            tone="text-[oklch(0.727_0.163_55)]"
            lines={briefing.affected}
            lng={currentLang}
          />
          <Section
            icon={ListChecks}
            title={t("briefing.recommendations", "Recommended actions")}
            subtitle={subtitleAwaiting}
            tone="text-[oklch(0.715_0.128_231)]"
            lines={briefing.recommendations}
            lng={currentLang}
          />
        </div>
      )}

      {briefing && (
        <p className="border-t border-border bg-background/40 px-4 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {currentLang === "hi"
            ? `लाइव रिकॉर्ड से ${briefing.method} द्वारा तैयार। अवलोकन वास्तविक तथ्य हैं; जोखिम नियम-इंजन के पूर्वानुमान हैं; सिफारिशों के लिए मानवीय स्वीकृति आवश्यक है। कोई भाषा मॉडल (LLM) शामिल नहीं है।`
            : currentLang === "as"
              ? `লাইভ ৰেকৰ্ডৰ পৰা ${briefing.method} দ্বাৰা প্ৰস্তুত। পৰ্যবেক্ষণ বাস্তৱ তথ্য; বিপদাশংকা পূৰ্বানুমান; পৰামৰ্শৰ বাবে মানৱ অনুমোদন প্ৰয়োজন। কোনো ভাষা মডেল জড়িত নহয়।`
              : currentLang === "mni"
                ? `লাইভ রেকর্দদগী ${briefing.method} না শেমগৎপা। য়েংশিনখিবা ৱাফমশিং অচুম্বা ফত্তবা ৱাফম্নি; খুদোংথীবশিং অসি পূর্বাভাষনি; সূপারিস্তশিংগীদমক মীগী অয়াবা মথৌ তাই। করিগুম্বা ল্যাঙ্গুয়েজ মোদেল য়াওদে।`
                : currentLang === "ne"
                  ? `प्रत्यक्ष रेकर्डहरूबाट ${briefing.method} द्वारा संकलित। अवलोकनहरू तथ्य हुन्; जोखिमहरू पूर्वानुमान हुन्; सिफारिसहरूलाई मानव स्वीकृति चाहिन्छ। कुनै भाषा मोडेल समावेश छैन।`
                  : `Composed by ${briefing.method} from live records. Observations are facts; risks are rule-engine forecasts; recommendations require human approval. No language model is involved.`}
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
  lng,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: string;
  lines: Array<{ text: string; entity?: string; severity?: string }>;
  lng: string;
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
              {translateBriefingLine(line.text, lng)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

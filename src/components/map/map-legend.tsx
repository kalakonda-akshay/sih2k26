"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const SAFE = "oklch(0.735 0.155 158)";
const MODERATE = "oklch(0.815 0.145 88)";
const HIGH = "oklch(0.727 0.163 55)";
const CRITICAL = "oklch(0.648 0.201 22)";

/**
 * Map legend.
 *
 * Explains both the colour ramp and the *shape* language, because shape is
 * what separates a confirmed incident (filled square) from an AI forecast
 * (dashed diamond) — a distinction colour alone cannot carry.
 */
export function MapLegend() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[400] w-44 overflow-hidden rounded-md border border-border bg-card/92 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {t("map.legend_title", "Legend")}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2.5 border-t border-border px-2.5 py-2">
          <Group title={t("map.legend_roads", "Road status")}>
            <Line hex={SAFE} label={t("map.filter_safe", "Accessible")} />
            <Line hex={HIGH} label={t("map.filter_warning", "Restricted")} dash="14 6" />
            <Line hex={CRITICAL} label={t("map.filter_critical", "Blocked")} dash="9 7" thick />
          </Group>

          <Group title={t("risk.level", "Risk level")}>
            <Swatch hex={SAFE} label={t("risk.low", "Low")} />
            <Swatch hex={MODERATE} label={t("risk.moderate", "Moderate")} />
            <Swatch hex={HIGH} label={t("risk.high", "High")} />
            <Swatch hex={CRITICAL} label={t("risk.critical", "Critical")} />
          </Group>

          <Group title={t("map.layers", "Markers")}>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: SAFE, background: `${SAFE}24` }}
              >
                <span
                  className="block size-0 border-x-[2.5px] border-b-[5px] border-x-transparent"
                  style={{ borderBottomColor: SAFE }}
                />
              </span>
              <span className="text-[10px] text-muted-foreground">{t("map.layer_vehicles", "Vehicle")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex size-3.5 shrink-0 rounded-full border-2"
                style={{ borderColor: CRITICAL, background: `${CRITICAL}24` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {t("emergency.title", "Emergency vehicle")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border font-mono text-[7px] font-semibold"
                style={{
                  borderColor: CRITICAL,
                  background: `${CRITICAL}2e`,
                  color: CRITICAL,
                }}
              >
                L
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("incidents.verified", "Confirmed incident")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-3 shrink-0 rotate-45 border border-dashed"
                style={{ borderColor: HIGH, background: `${HIGH}1f` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {t("risk.title", "AI predicted risk")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-3.5 shrink-0 items-center justify-center">
                <span className="absolute size-3 rounded-full border border-destructive animate-ping opacity-75" />
                <span className="size-2 rounded-full bg-destructive" />
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("map.pulse_beacon", "Live critical alert")}
              </span>
            </div>
          </Group>

          <p className="border-t border-border pt-1.5 text-[9px] leading-relaxed text-muted-foreground">
            Incident codes: L landslide · F flood · R road · B bridge · A
            accident · T traffic
          </p>
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {title}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Line({
  hex,
  label,
  dash,
  thick,
}: {
  hex: string;
  label: string;
  dash?: string;
  thick?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="18" height="6" className="shrink-0" aria-hidden>
        <line
          x1="0"
          y1="3"
          x2="18"
          y2="3"
          stroke={hex}
          strokeWidth={thick ? 3 : 2}
          strokeDasharray={dash}
        />
      </svg>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: hex }}
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

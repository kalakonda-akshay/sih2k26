import type { ReactNode } from "react";

/**
 * Shared popup body so every marker type reads the same way: a coloured
 * status dot, a category eyebrow, the entity name, then a labelled key/value
 * grid. Consistency here is what stops the map feeling like five different
 * features bolted together.
 */
export function MapPopup({
  eyebrow,
  title,
  toneHex,
  toneLabel,
  rows,
  children,
}: {
  eyebrow: string;
  title: string;
  toneHex: string;
  toneLabel: string;
  rows: Array<[string, string]>;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-[280px] p-3 font-sans">
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: toneHex }}
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </span>
        <span
          className="ml-auto font-mono text-[9px] uppercase tracking-wider"
          style={{ color: toneHex }}
        >
          {toneLabel}
        </span>
      </div>

      <div className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
        {title}
      </div>

      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-[11px] text-muted-foreground">{key}</dt>
            <dd className="text-right text-[11px] font-medium text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {children}
    </div>
  );
}

/** Emphasised block for a recommended action inside a popup. */
export function PopupAction({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 rounded border border-border bg-background/70 px-2 py-1.5">
      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
        Recommended action
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/90">
        {children}
      </p>
    </div>
  );
}

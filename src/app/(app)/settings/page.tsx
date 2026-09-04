import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — NER-Vision AI",
};

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl rounded-lg border border-border bg-card p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Phase 3
        </div>
        <h2 className="mt-2 text-lg font-semibold">Settings</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Role management, language preferences and alert thresholds are
          scheduled for a later phase. The data model already carries the
          fields they need — user roles, locale and alert severity bands — so
          this page is wiring, not redesign.
        </p>
      </div>
    </div>
  );
}

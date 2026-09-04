"use client";

import { useEffect, useState } from "react";
import { Check, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Chrome's install event. Not in lib.dom yet, so declared here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install app" control.
 *
 * Android Chrome fires `beforeinstallprompt` only when the installability
 * criteria are met — HTTPS, a manifest with 192px and 512px icons, and a
 * registered service worker with a fetch handler. The button therefore only
 * appears when installing will actually work, rather than offering an action
 * that silently does nothing.
 *
 * iOS Safari never fires the event and has no programmatic install, so there
 * we show the manual Share → Add to Home Screen instruction instead of
 * pretending a button exists.
 */
export function InstallApp({
  className,
  variant = "full",
}: {
  className?: string;
  /**
   * "compact" renders only the install button and nothing otherwise, so it
   * can sit in the header without disturbing the layout on iOS or once the
   * app is already installed.
   */
  variant?: "full" | "compact";
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Already running as an installed app — nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
        !/crios|fxios/i.test(navigator.userAgent),
    );

    const onPrompt = (event: Event) => {
      // Suppress Chrome's own banner so the app can place the control.
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    if (variant === "compact") return null;
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-[oklch(0.735_0.155_158)]/35 bg-[oklch(0.735_0.155_158)]/10 px-2.5 py-1.5",
          className,
        )}
      >
        <Check className="size-3.5 text-[oklch(0.735_0.155_158)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[oklch(0.735_0.155_158)]">
          Installed
        </span>
      </div>
    );
  }

  if (isIos) {
    if (variant === "compact") return null;
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-muted/30 px-2.5 py-2",
          className,
        )}
      >
        <div className="flex items-center gap-1.5">
          <Smartphone className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Install on iOS
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Tap Share, then <strong>Add to Home Screen</strong>. iOS has no
          one-tap install.
        </p>
      </div>
    );
  }

  if (!prompt) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("h-9 gap-2 text-xs", className)}
      onClick={async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") setInstalled(true);
        setPrompt(null);
      }}
    >
      <Download className="size-3.5" />
      Install app
    </Button>
  );
}

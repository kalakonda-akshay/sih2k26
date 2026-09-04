"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Deliberately skipped in development: an aggressively caching worker and
 * hot-module reloading fight each other, and the resulting stale-asset bugs
 * cost more time than the offline behaviour saves while developing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing must never break the app — it only means no
        // offline shell and no install prompt.
      });
    };

    // Wait for load so the worker never competes with first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

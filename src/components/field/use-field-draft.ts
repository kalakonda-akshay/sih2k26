"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/**
 * Connectivity and draft preservation for field reporting.
 *
 * ## What this honestly does
 *
 * Convex mutations do **not** queue and replay themselves offline. This hook
 * does not pretend otherwise. What it provides is the useful, achievable
 * subset:
 *
 * - detects online/offline and surfaces it plainly
 * - keeps the in-progress report in `localStorage` on every keystroke, so a
 *   dropped connection, a backgrounded tab or a closed browser never loses
 *   what the officer typed
 * - restores that draft on return and lets them submit when connectivity is
 *   back
 *
 * A report is only ever shown as submitted once the Convex mutation has
 * actually returned an id. There is no optimistic "sent" state, because in
 * the field a false confirmation is worse than an honest failure.
 *
 * ## Why `useSyncExternalStore`
 *
 * Both `navigator.onLine` and `localStorage` are external mutable sources
 * that React does not own. Reading them in an effect and calling `setState`
 * causes a cascading re-render on every mount and tears under concurrent
 * rendering. `useSyncExternalStore` is the API built for exactly this, and
 * its server snapshot removes the hydration mismatch that a lazy
 * `useState(() => localStorage.getItem(...))` would introduce.
 */

const DRAFT_KEY = "ner-vision:field-incident-draft";

export interface FieldDraft {
  incidentType: string;
  severity: string;
  description: string;
  locationName: string;
  district: string;
  state: string;
  accessibility: string;
  latitude: number | null;
  longitude: number | null;
  savedAt: number;
}

export const EMPTY_DRAFT: FieldDraft = {
  incidentType: "landslide",
  severity: "high",
  description: "",
  locationName: "",
  district: "",
  state: "",
  accessibility: "restricted",
  latitude: null,
  longitude: null,
  savedAt: 0,
};

/* ---------------------------------------------------------- draft store */

/**
 * Module-level store over localStorage.
 *
 * `getSnapshot` must return a stable reference when nothing changed, or
 * React re-renders forever — hence the cache, invalidated only on write.
 */
let cachedRaw: string | null = null;
let cachedDraft: FieldDraft = EMPTY_DRAFT;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(DRAFT_KEY);
  } catch {
    // Private mode or blocked storage — behave as if there is no draft.
    return null;
  }
}

function getDraftSnapshot(): FieldDraft {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedDraft = raw
        ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<FieldDraft>) }
        : EMPTY_DRAFT;
    } catch {
      cachedDraft = EMPTY_DRAFT;
    }
  }
  return cachedDraft;
}

/** The server has no localStorage; render the empty form and hydrate cleanly. */
function getDraftServerSnapshot(): FieldDraft {
  return EMPTY_DRAFT;
}

function subscribeDraft(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab editing the same draft should be reflected here too.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeDraft(next: FieldDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable. The form still works for this session; it just
    // cannot survive a reload.
  }
  for (const listener of listeners) listener();
}

function removeDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
  for (const listener of listeners) listener();
}

/* --------------------------------------------------- connectivity store */

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * `navigator.onLine` is coarse — it reports whether the OS has a network
 * interface, not whether Convex is reachable. It is therefore trusted to say
 * "offline" but never treated as a guarantee of a working connection.
 */
const getOnlineSnapshot = () => window.navigator.onLine;

/** Assume connected during SSR; the client corrects it on hydration. */
const getOnlineServerSnapshot = () => true;

/* ----------------------------------------------------------------- hook */

export function useFieldDraft() {
  const stored = useSyncExternalStore(
    subscribeDraft,
    getDraftSnapshot,
    getDraftServerSnapshot,
  );

  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );

  const setDraft = useCallback(
    (next: Partial<FieldDraft>) => {
      writeDraft({ ...getDraftSnapshot(), ...next, savedAt: Date.now() });
    },
    [],
  );

  const clearDraft = useCallback(() => {
    removeDraft();
  }, []);

  const restored = stored.description.length > 0 || stored.locationName.length > 0;

  return { draft: stored, setDraft, clearDraft, restored, online };
}

/* ----------------------------------------------------- location capture */

export type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; latitude: number; longitude: number; accuracy: number }
  | { status: "denied" }
  | { status: "unavailable"; reason: string };

/**
 * One-shot GPS fix from the browser.
 *
 * This is a single `getCurrentPosition` call on user action — not continuous
 * tracking, and not a professional GNSS fix. Accuracy is reported alongside
 * the coordinates so the officer can judge whether to trust it, and manual
 * entry stays available for when it is wrong or denied.
 */
export function useLocationCapture() {
  const [state, setState] = useState<LocationState>({ status: "idle" });

  const capture = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        status: "unavailable",
        reason: "This device or browser does not expose a location API.",
      });
      return;
    }

    setState({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState({ status: "denied" });
        } else {
          setState({
            status: "unavailable",
            reason:
              error.code === error.TIMEOUT
                ? "Location request timed out — no fix available here."
                : "Position could not be determined.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, []);

  return { state, capture };
}

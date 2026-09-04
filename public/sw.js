/*
 * NER-Vision AI — service worker.
 *
 * Two jobs:
 *
 *   1. Make the app installable. Chrome on Android will not offer "Install
 *      app" without a service worker that has a fetch handler, however good
 *      the manifest is.
 *   2. Keep the app usable when the network drops — which, in the North East,
 *      is the normal case rather than the edge case.
 *
 * WHAT THIS DOES NOT DO, deliberately:
 *
 *   Convex mutations are never queued or replayed here. Filing an incident
 *   still requires a live connection. A service worker that silently accepted
 *   a report and lost it would be worse than one that refuses — a field
 *   officer who believes a landslide has been reported stops trying to report
 *   it. Drafts are preserved client-side instead, and the UI says plainly
 *   that a report is unsent until the database returns an id.
 */

const VERSION = "ner-vision-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const TILES = `${VERSION}-tiles`;

/** Routes worth having available cold, offline. */
const PRECACHE = ["/field", "/offline", "/icon.svg", "/manifest.webmanifest"];

/** Tiles are large and endless; keep a bounded working set. */
const TILE_LIMIT = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Individual failures must not abort the whole install.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Trim a cache to its most recent `limit` entries. */
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* Convex is live state. Caching it would show a stale world as if it were
     current, which on an operations console is worse than showing nothing. */
  if (url.hostname.endsWith(".convex.cloud") || url.hostname.endsWith(".convex.site")) {
    return;
  }

  /* Navigations: network first, so a connected user always sees live data;
     fall back to the cached shell, then to an explicit offline page. */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          return (
            offline ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  /* Build output is content-hashed and immutable, so cache-first is safe and
     makes a warm start essentially instant. */
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        const cache = await caches.open(ASSETS);
        cache.put(request, fresh.clone());
        return fresh;
      })(),
    );
    return;
  }

  /* Map tiles: serve what we have immediately, refresh in the background.
     A slightly stale basemap is fine; a blank map is not. */
  if (url.hostname.includes("arcgisonline.com")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(TILES);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              void trim(TILES, TILE_LIMIT);
            }
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      })(),
    );
    return;
  }

  /* Everything else same-origin (icons, documents): cache, then network. */
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(ASSETS);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return new Response("", { status: 504 });
        }
      })(),
    );
  }
});

/**
 * Carrot Chase — minimal service worker.
 *
 * Goal: keep the Run Event flow usable when on-site signal is weak.
 *
 * Strategy
 *  - Pre-cache the app shell (root document + manifest + icons).
 *  - Cache-first for static assets (_next/static, fonts, icons).
 *  - Stale-while-revalidate for HTML pages so the lead always sees the last good
 *    render of the run-event UI even when offline.
 *  - Network-only for Supabase API calls — never cache PII or stale auth.
 */

const VERSION = "cc-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const PAGE_CACHE = `${VERSION}-pages`;

const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never touch Supabase, auth, or any data API
  if (
    url.host.endsWith(".supabase.co") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(cacheFirst(ASSET_CACHE, req));
    return;
  }

  // SWR for navigations / HTML
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(staleWhileRevalidate(PAGE_CACHE, req));
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req)),
  );
});

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response("Offline", { status: 503 });
}

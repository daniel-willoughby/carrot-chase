/**
 * Carrot Chase — minimal service worker.
 *
 * Goal: keep the Run Event flow usable when on-site signal is weak.
 *
 * Strategy
 *  - Pre-cache the app shell (root document + manifest + icons).
 *  - Cache-first for static assets (_next/static, fonts, icons).
 *  - Stale-while-revalidate for top-level HTML documents only.
 *  - Network-only for Supabase, server actions, and React Server Component
 *    payloads (those carry an RSC header or `?_rsc=` query — caching them
 *    breaks client-side navigation and POST flows).
 */

const VERSION = "cc-v2";
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
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Allow the page to ask us to step aside (used by PwaRegistrar in dev).
  if (event.data === "unregister") {
    self.registration.unregister().then(() => self.clients.claim());
  }
});

function isRscRequest(req, url) {
  // Next.js RSC payloads carry `RSC: 1` and accept `text/x-component`.
  // Either header alone is enough; query-string fallback covers older Next.
  if (req.headers.get("RSC") === "1") return true;
  const accept = req.headers.get("Accept") || "";
  if (accept.includes("text/x-component")) return true;
  if (url.searchParams.has("_rsc")) return true;
  return false;
}

function isServerAction(req) {
  // Server actions are POSTs to the page URL with a Next-Action header.
  return req.method === "POST" || req.headers.has("Next-Action");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cross-origin: do not touch.
  if (url.origin !== self.location.origin) return;

  // Anything non-GET: do not touch.
  if (req.method !== "GET") return;

  // Server actions, RSC payloads, Supabase, auth, API: pass through to network.
  if (
    isRscRequest(req, url) ||
    isServerAction(req) ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/icon.svg" ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(cacheFirst(ASSET_CACHE, req));
    return;
  }

  // SWR for top-level navigations only (full document fetches).
  if (req.mode === "navigate" && req.destination === "document") {
    event.respondWith(staleWhileRevalidate(PAGE_CACHE, req));
    return;
  }

  // Everything else: pass through.
});

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
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

"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production, and aggressively unregisters
 * any existing service worker in development.
 *
 * Why the dev cleanup: once an SW is installed (e.g. from a previous prod
 * build), the browser will keep using it on localhost even in dev. A stale
 * or buggy SW can break RSC payload fetches and server actions until
 * unregistered. This component takes care of that automatically.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] sw registration failed", err));
      return;
    }

    // Dev: ensure no SW is intercepting requests.
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.active) reg.active.postMessage("unregister");
          await reg.unregister();
        }
        if (regs.length > 0) {
          // Caches outlive the SW; clear them so a stale page shell doesn't
          // surface on the next navigation.
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          console.info(
            "[pwa] unregistered stale service worker(s) and cleared caches",
          );
        }
      } catch (err) {
        console.warn("[pwa] could not clean up service worker:", err);
      }
    })();
  }, []);

  return null;
}

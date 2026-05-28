"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on mount.
 *
 * Lives as a tiny client component so the root layout can stay an RSC.
 * Safe in dev too — the SW is a no-op for Supabase/API paths.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("[pwa] sw registration failed", err));
  }, []);

  return null;
}

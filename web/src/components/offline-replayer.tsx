"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  listQueue,
  removeFromQueue,
  isOnline,
} from "@/lib/offline/result-queue";
import { commitResultsAction } from "@/app/dashboard/lead/events/[id]/run/actions";

/**
 * Drains the offline result queue when the device comes back online.
 *
 * Mounted in the dashboard layout so it's active for every authed page.
 * Each successful flush refreshes the route (events list updates).
 */
export function OfflineReplayer() {
  const showToast = useToast();
  const router = useRouter();
  const drainingRef = useRef(false);

  useEffect(() => {
    async function drain() {
      if (drainingRef.current || !isOnline()) return;
      drainingRef.current = true;
      try {
        const entries = await listQueue();
        if (entries.length === 0) return;
        let ok = 0;
        let fail = 0;
        for (const entry of entries) {
          try {
            const res = await commitResultsAction(
              entry.eventId,
              entry.finishers,
            );
            // Server action redirects on success → it throws NEXT_REDIRECT
            // which we treat as success here.
            if (res && "error" in res && res.error) {
              fail += 1;
              continue;
            }
            await removeFromQueue(entry.id);
            ok += 1;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            // The action's success path throws NEXT_REDIRECT; treat that as ok.
            if (msg.includes("NEXT_REDIRECT")) {
              await removeFromQueue(entry.id);
              ok += 1;
            } else {
              fail += 1;
            }
          }
        }
        if (ok > 0) {
          showToast(
            `Synced ${ok} queued result${ok === 1 ? "" : "s"}`,
            "success",
          );
          router.refresh();
        }
        if (fail > 0) {
          showToast(
            `${fail} queued result${fail === 1 ? "" : "s"} failed — will retry`,
            "error",
          );
        }
      } finally {
        drainingRef.current = false;
      }
    }

    // Run on mount and whenever we come back online
    void drain();
    window.addEventListener("online", drain);
    return () => window.removeEventListener("online", drain);
  }, [router, showToast]);

  return null;
}

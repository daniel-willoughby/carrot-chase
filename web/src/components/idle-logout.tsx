"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { signOutAction } from "@/app/auth/actions";

/**
 * Inactivity auto-logout.
 *
 * After IDLE_MS with no user activity the session is signed out. A warning
 * dialog appears WARN_MS before that, with a live countdown and a "Stay
 * signed in" button so an active user is never logged out without notice.
 *
 * Mounted inside the authenticated dashboard layout only, so it never runs
 * on public pages. Activity is tracked with passive listeners; once the
 * warning is showing we deliberately stop auto-extending on movement — the
 * user must explicitly choose to stay, which is the point of the prompt.
 */
const IDLE_MS = 15 * 60 * 1000; // 15 minutes
const WARN_MS = 60 * 1000; // warn 60s before logout

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
] as const;

export function IdleLogout() {
  const deadlineRef = useRef<number>(Date.now() + IDLE_MS);
  const [warnOpen, setWarnOpen] = useState(false);
  const [remaining, setRemaining] = useState(WARN_MS);
  const [, startTransition] = useTransition();
  const loggingOutRef = useRef(false);

  const logout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    startTransition(() => {
      void signOutAction();
    });
  }, []);

  const extend = useCallback(() => {
    deadlineRef.current = Date.now() + IDLE_MS;
    setWarnOpen(false);
  }, []);

  // Passive activity tracking — only while the warning is NOT showing.
  useEffect(() => {
    if (warnOpen) return;
    const onActivity = () => {
      deadlineRef.current = Date.now() + IDLE_MS;
    };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [warnOpen]);

  // Single ticking interval drives both the warning and the final logout.
  useEffect(() => {
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      if (left <= 0) {
        logout();
        return;
      }
      if (left <= WARN_MS) {
        setWarnOpen(true);
        setRemaining(left);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [logout]);

  if (!warnOpen) return null;

  const secs = Math.max(0, Math.ceil(remaining / 1000));

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-3xl border p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="mb-1 text-3xl" aria-hidden>
          ⏰
        </div>
        <h2
          id="idle-title"
          className="text-lg font-bold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Still there?
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          You&apos;ve been inactive for a while. For your security you&apos;ll be
          signed out in{" "}
          <span className="font-bold" style={{ color: "var(--orange)" }}>
            {secs}s
          </span>
          .
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={logout}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold"
            style={{
              border: "1px solid var(--border)",
              color: "var(--muted)",
              background: "transparent",
            }}
          >
            Sign out now
          </button>
          <button
            onClick={extend}
            autoFocus
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--orange-gradient)" }}
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}

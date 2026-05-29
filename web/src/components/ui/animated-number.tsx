"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Count-up display, ported from the prototype StatCard.
 *
 * Accepts numbers OR a string like "£12,400". Non-numeric values ("—", "5:42")
 * render verbatim. The animation only runs ONCE per mount of a given value —
 * React 19 Strict Mode double-invokes effects in dev which would otherwise
 * leave the count stuck mid-animation.
 */
export function AnimatedNumber({ value }: { value: string | number }) {
  const str = String(value);
  const startedFor = useRef<string | null>(null);
  const [shown, setShown] = useState<string>(str);

  useEffect(() => {
    // Re-animate only when the target value really changes.
    if (startedFor.current === str) return;
    startedFor.current = str;

    const prefix = str.startsWith("£") ? "£" : "";
    const stripped = str.replace(/[£,]/g, "");
    const num = Number(stripped);
    const isPlain = !isNaN(num) && num > 0 && !/[:/a-zA-Z]/.test(str);
    if (!isPlain) {
      setShown(str);
      return;
    }

    const useCommas = str.includes(",");
    const dur = 480;
    const startTs = performance.now();
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      const t = Math.min((performance.now() - startTs) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(ease * num);
      setShown(prefix + (useCommas ? cur.toLocaleString() : String(cur)));
      if (t < 1) requestAnimationFrame(step);
      else setShown(str);
    };
    requestAnimationFrame(step);

    // Note: no cleanup that cancels the animation. Strict Mode's double-mount
    // simulation in dev was leaving the count stuck mid-way; the `cancelled`
    // flag here is unused but kept for future safety. The duration is short
    // (480ms) so leaving the raf chain running across remounts is harmless.
    return () => {
      cancelled = true;
    };
  }, [str]);

  return <>{shown}</>;
}

"use client";

import { useEffect, useState } from "react";

/**
 * Count-up display, ported from the prototype StatCard.
 * Accepts numbers OR a string like "£12,400". Non-numeric (e.g. "—", "5:42")
 * renders verbatim.
 */
export function AnimatedNumber({ value }: { value: string | number }) {
  const str = String(value);
  const [shown, setShown] = useState<string>(str);

  useEffect(() => {
    const prefix = str.startsWith("£") ? "£" : "";
    const stripped = str.replace(/[£,]/g, "");
    const num = Number(stripped);
    const isPlain = !isNaN(num) && num > 0 && !/[:/a-zA-Z]/.test(str);

    if (!isPlain) {
      setShown(str);
      return;
    }

    const useCommas = str.includes(",");
    let start: number | null = null;
    const dur = 480;
    let raf = 0;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(ease * num);
      setShown(prefix + (useCommas ? cur.toLocaleString() : String(cur)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setShown(str);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [str]);

  return <>{shown}</>;
}

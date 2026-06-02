"use client";

import { useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";

/**
 * Plays the celebratory fanfare once when the results page mounts — restoring
 * the prototype's "Race Complete" moment. Renders nothing.
 *
 * The AudioContext was already unlocked by the user's tap on "Confirm results"
 * just before navigating here, so the fanfare is allowed to play.
 */
export function ResultFanfare() {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const t = setTimeout(() => sfx.fanfare(), 250);
    return () => clearTimeout(t);
  }, []);
  return null;
}

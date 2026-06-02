"use client";

import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

/**
 * App-wide click feedback, matching the prototype's ambient UI sounds.
 *
 * Attaches a single delegated listener rather than wiring every button. Plays
 * a soft click on buttons / links / role=button presses; opt out per element
 * with `data-no-sfx` (e.g. the run-event tap button, which has its own
 * louder sound). The first real click also unlocks the AudioContext, so the
 * richer event sounds that follow can play under browser autoplay rules.
 */
export function UiSounds() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest(
        "button, a[href], [role='button']",
      );
      if (!el) return;
      if (el.closest("[data-no-sfx]")) return;
      sfx.click();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

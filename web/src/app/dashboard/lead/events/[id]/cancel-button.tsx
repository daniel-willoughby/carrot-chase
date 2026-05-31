"use client";

import { useTransition } from "react";
import { cancelEventAction } from "./actions";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "Cancel this event?\n\n" +
          "The event will show as Cancelled in the events list. Run history " +
          "and roster stay intact — you can re-create a new event from the " +
          "same group if it gets rescheduled.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await cancelEventAction(eventId);
      if (res?.error) alert(`Could not cancel: ${res.error}`);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
      style={{
        border: "1px solid var(--danger)",
        color: "var(--danger)",
        background: "transparent",
      }}
    >
      {isPending ? "Cancelling…" : "Cancel event"}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetDemoDataAction } from "@/app/dashboard/actions";

export function ResetDemoButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "Reset demo data?\n\n" +
          "This clears all race results, sets every event back to " +
          "scheduled, and zeroes streaks + PBs in your organisation.\n" +
          "Runners and groups stay in place.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await resetDemoDataAction();
      if (res.error) {
        alert(`Reset failed: ${res.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-[11px] font-medium underline-offset-2 hover:underline disabled:opacity-60"
      style={{ color: "var(--muted)" }}
    >
      {isPending ? "Resetting…" : "Reset demo data"}
    </button>
  );
}

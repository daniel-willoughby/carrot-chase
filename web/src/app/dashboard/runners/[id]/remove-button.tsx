"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeRunnerAction } from "@/app/dashboard/school/members/actions";

type Props = {
  runnerId: string;
  runnerName: string;
};

export function RemoveRunnerButton({ runnerId, runnerName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        `Remove ${runnerName} from the roster?\n\n` +
          "They'll be hidden from active lists, but their event results and " +
          "historical levels stay intact.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await removeRunnerAction(runnerId);
      if (res.error) {
        alert(`Could not remove runner: ${res.error}`);
        return;
      }
      router.push("/dashboard/school/members");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
      style={{
        borderColor: "var(--danger)",
        color: "var(--danger)",
      }}
    >
      {isPending ? "Removing…" : "Remove runner"}
    </button>
  );
}

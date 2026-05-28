"use client";

import { useTransition } from "react";
import { archiveGroupAction, restoreGroupAction } from "./actions";

export function ArchiveButton({
  groupId,
  archived,
}: {
  groupId: string;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          !archived &&
          !confirm("Archive this group? Event history is preserved.")
        ) {
          return;
        }
        startTransition(async () => {
          if (archived) await restoreGroupAction(groupId);
          else await archiveGroupAction(groupId);
        });
      }}
      className="rounded-full border border-[color:var(--border)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground-secondary)] transition-colors hover:bg-[color:var(--background-subtle)] disabled:opacity-50"
    >
      {isPending ? "…" : archived ? "Restore" : "Archive"}
    </button>
  );
}

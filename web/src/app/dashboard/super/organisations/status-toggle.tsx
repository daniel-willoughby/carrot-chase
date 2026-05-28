"use client";

import { useTransition } from "react";
import { setOrganisationStatusAction } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type OrgStatus = Database["public"]["Enums"]["org_status"];

const NEXT_STATUS: Record<OrgStatus, OrgStatus> = {
  active: "suspended",
  suspended: "active",
  archived: "active",
};

const ACTION_LABEL: Record<OrgStatus, string> = {
  active: "Suspend",
  suspended: "Reactivate",
  archived: "Reactivate",
};

export function StatusToggle({
  orgId,
  status,
}: {
  orgId: string;
  status: OrgStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setOrganisationStatusAction(orgId, NEXT_STATUS[status]);
        })
      }
      className="rounded-full border border-[color:var(--border)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground-secondary)] transition-colors hover:bg-[color:var(--background-subtle)] disabled:opacity-50"
    >
      {isPending ? "…" : ACTION_LABEL[status]}
    </button>
  );
}

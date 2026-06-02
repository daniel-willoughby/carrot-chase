"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { addMemberAction, removeMemberAction } from "../actions";

type Member = {
  id: string;
  full_name: string;
  cc_id: string | null;
  current_level: number;
  year_group: string | null;
};

export function MemberAssignment({
  groupId,
  members,
  availableRunners,
}: {
  groupId: string;
  members: Member[];
  availableRunners: Member[];
}) {
  const [picker, setPicker] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function add() {
    if (!picker) return;
    startTransition(async () => {
      const res = await addMemberAction(groupId, picker);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Member added", "success");
        setPicker("");
      }
    });
  }

  function remove(runnerId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    startTransition(async () => {
      const res = await removeMemberAction(groupId, runnerId);
      if (res.error) showToast(res.error, "error");
      else showToast("Member removed", "success");
    });
  }

  return (
    <div className="mt-1">
      {members.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No members yet. Add runners from the list below.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {members.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.full_name}</div>
                <div
                  className="truncate text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {r.cc_id ?? "—"} · {r.year_group ?? "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone="orange">L{r.current_level}</Badge>
                <button
                  onClick={() => remove(r.id, r.full_name)}
                  disabled={isPending}
                  className="text-xs font-semibold disabled:opacity-50"
                  style={{ color: "var(--danger)" }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {availableRunners.length > 0 ? (
        <div className="mt-4 flex gap-2">
          <select
            value={picker}
            onChange={(e) => setPicker(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="">Choose a runner to add…</option>
            {availableRunners.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
                {r.year_group ? ` · ${r.year_group}` : ""}
              </option>
            ))}
          </select>
          <Button onClick={add} disabled={!picker || isPending}>
            {isPending ? "…" : "Add"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          All runners in your school are already in this group. Add more from
          the Members section.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  assignLeadAction,
  unassignLeadAction,
} from "../actions";

type LeadOption = { id: string; full_name: string | null; email: string };
type AssignedLead = {
  lead_id: string;
  profiles: { full_name: string | null; email: string } | null;
};

export function LeadAssignment({
  groupId,
  assigned,
  availableLeads,
}: {
  groupId: string;
  assigned: AssignedLead[];
  availableLeads: LeadOption[];
}) {
  const [picker, setPicker] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function assign() {
    if (!picker) return;
    startTransition(async () => {
      const res = await assignLeadAction(groupId, picker);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Lead assigned", "success");
        setPicker("");
      }
    });
  }

  function unassign(leadId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    startTransition(async () => {
      const res = await unassignLeadAction(groupId, leadId);
      if (res.error) showToast(res.error, "error");
      else showToast("Lead removed", "success");
    });
  }

  return (
    <div className="mt-4">
      {assigned.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No leads assigned yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {assigned.map((l) => {
            const name = l.profiles?.full_name || l.profiles?.email || "Unknown";
            return (
              <li
                key={l.lead_id}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                style={{ background: "var(--background-subtle)" }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{name}</div>
                  {l.profiles?.email && (
                    <div
                      className="truncate text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {l.profiles.email}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => unassign(l.lead_id, name)}
                  disabled={isPending}
                  className="shrink-0 text-xs font-semibold disabled:opacity-50"
                  style={{ color: "var(--danger)" }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {availableLeads.length > 0 && (
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
            <option value="">Choose a lead to assign…</option>
            {availableLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name || l.email}
              </option>
            ))}
          </select>
          <Button onClick={assign} disabled={!picker || isPending}>
            {isPending ? "…" : "Assign"}
          </Button>
        </div>
      )}
      {availableLeads.length === 0 && assigned.length > 0 && (
        <p
          className="mt-3 text-xs"
          style={{ color: "var(--muted)" }}
        >
          All available leads are already assigned. Invite more from the
          Members section.
        </p>
      )}
    </div>
  );
}

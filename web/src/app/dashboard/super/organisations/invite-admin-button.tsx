"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { inviteAdminAction, type OrgActionState } from "./actions";

export function InviteAdminButton({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<OrgActionState, FormData>(
    inviteAdminAction.bind(null, orgId),
    {},
  );

  // Close on a clean success; keep open to show the email warning.
  useEffect(() => {
    if (state.ok && !state.emailWarning) setOpen(false);
  }, [state.ok, state.emailWarning]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground-secondary)",
        }}
      >
        ✉ Invite admin
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite an admin"
        description={`Send a School Admin sign-up link for ${orgName}.`}
      >
        <form action={formAction} className="space-y-4">
          <FormField label="Email address" required>
            <Input
              name="email"
              type="email"
              required
              placeholder="head@school.co.uk"
              autoFocus
            />
          </FormField>

          {state.error && (
            <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
              {state.error}
            </div>
          )}
          {state.emailWarning && (
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{
                background: "var(--warning-light)",
                border: "1px solid var(--warning)",
                color: "var(--warning)",
              }}
            >
              ⚠ {state.emailWarning} Copy the invite link from the Invitations
              tab.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

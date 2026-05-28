"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createRunnerAction, type MemberActionState } from "./actions";

type Group = { id: string; name: string };

export function NewRunnerModal({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<MemberActionState, FormData>(
    createRunnerAction,
    {},
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add runner</Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add runner"
        description="Add a single runner. For multiple at once, use CSV import."
      >
        <form action={formAction} className="space-y-4">
          <FormField label="Full name" required>
            <Input name="full_name" required placeholder="Alice Smith" />
          </FormField>

          <FormField label="Year group">
            <Input name="year_group" placeholder="Year 5" />
          </FormField>

          <FormField label="Initial group" hint="Optional — you can add more later">
            <Select name="group_id" defaultValue="">
              <option value="">— none —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </FormField>

          {state.error && (
            <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
              {state.error}
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
              {isPending ? "Adding…" : "Add runner"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createGroupAction, type GroupActionState } from "./actions";

const GROUP_TYPES = [
  { value: "year", label: "Year Group (e.g. Year 5)" },
  { value: "class", label: "Class (e.g. 5W)" },
  { value: "pe_class", label: "PE Class" },
  { value: "breakfast_club", label: "Breakfast Club" },
  { value: "club", label: "After-school Club" },
  { value: "custom", label: "Custom" },
];

export function NewGroupModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<GroupActionState, FormData>(
    createGroupAction,
    {},
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New group</Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create group"
        description="A group is the unit that holds runners and events together."
      >
        <form action={formAction} className="space-y-4">
          <FormField label="Group name" required>
            <Input name="name" required placeholder="Year 5 Breakfast Club" />
          </FormField>

          <FormField label="Type" required>
            <Select name="group_type" defaultValue="club" required>
              {GROUP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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
              {isPending ? "Creating…" : "Create group"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

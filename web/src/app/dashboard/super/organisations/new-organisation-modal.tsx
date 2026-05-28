"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createOrganisationAction, type OrgActionState } from "./actions";

const ORG_TYPES = [
  { value: "school", label: "School" },
  { value: "club", label: "Running Club" },
  { value: "business", label: "Business / Corporate" },
  { value: "distributor", label: "Distributor (e.g. CM Sports)" },
  { value: "mat", label: "Multi-Academy Trust" },
];

export function NewOrganisationModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<OrgActionState, FormData>(
    createOrganisationAction,
    {},
  );

  // Auto-close on success
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New organisation</Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add organisation"
        description="Create a new school, club, or partner organisation."
      >
        <form action={formAction} className="space-y-4">
          <FormField label="Organisation name" required>
            <Input name="name" required placeholder="Hampton Primary School" />
          </FormField>

          <FormField label="Type" required>
            <Select name="org_type" defaultValue="school" required>
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Location" hint="City or region, optional">
            <Input name="location" placeholder="London" />
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
              {isPending ? "Creating…" : "Create organisation"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

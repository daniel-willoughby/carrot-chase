"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { updateOrganisationAction, type OrgActionState } from "./actions";

const ORG_TYPES = [
  { value: "school", label: "School" },
  { value: "club", label: "Running Club" },
  { value: "business", label: "Business / Corporate" },
  { value: "distributor", label: "Distributor (e.g. CM Sports)" },
  { value: "mat", label: "Multi-Academy Trust" },
];

export function EditOrganisationModal({
  org,
}: {
  org: { id: string; name: string; org_type: string; location: string | null };
}) {
  const [open, setOpen] = useState(false);
  // Bind the organisation id so the action keeps the (prev, formData) shape
  // that useActionState expects.
  const [state, formAction, isPending] = useActionState<OrgActionState, FormData>(
    updateOrganisationAction.bind(null, org.id),
    {},
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Edit
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit organisation"
        description="Update this organisation's details."
      >
        <form action={formAction} className="space-y-4">
          <FormField label="Organisation name" required>
            <Input name="name" required defaultValue={org.name} />
          </FormField>

          <FormField label="Type" required>
            <Select name="org_type" defaultValue={org.org_type} required>
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Location" hint="City or region, optional">
            <Input
              name="location"
              defaultValue={org.location ?? ""}
              placeholder="London"
            />
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
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

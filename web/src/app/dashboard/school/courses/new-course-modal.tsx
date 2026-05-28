"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createCourseAction, type CourseActionState } from "./actions";

export function NewCourseModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    CourseActionState,
    FormData
  >(createCourseAction, {});

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New course</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New course"
        description="Custom courses are visible to all leads in your organisation."
      >
        <form action={formAction} className="space-y-4">
          <FormField label="Name" required>
            <Input
              name="name"
              placeholder="e.g. School Loop"
              autoCapitalize="words"
              required
            />
          </FormField>
          <FormField label="Distance (metres)" required>
            <Input
              name="distance_metres"
              type="number"
              min={50}
              max={50000}
              placeholder="1500"
              required
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
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Add course"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

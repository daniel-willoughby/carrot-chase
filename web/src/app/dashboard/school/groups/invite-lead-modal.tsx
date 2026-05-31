"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { inviteLeadAction } from "./actions";

type Group = { id: string; name: string };

export function InviteLeadModal({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setEmail("");
    setSelected(new Set());
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await inviteLeadAction(email, [...selected]);
      if (res.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground-secondary)",
        }}
      >
        ✉ Invite Lead
      </button>

      <Modal
        open={open}
        title="Invite a Lead"
        description="They'll get an email with a link to claim their account and the groups you assign here."
        onClose={() => {
          reset();
          setOpen(false);
        }}
      >
          <div className="space-y-4">
            <FormField label="Email address" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paula@hamptonprimary.co.uk"
                autoFocus
              />
            </FormField>

            <FormField
              label="Assign to groups"
              hint="Optional — leave blank to invite without group assignments."
            >
              <div className="flex flex-wrap gap-1.5">
                {groups.length === 0 && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    No groups yet — create one first.
                  </span>
                )}
                {groups.map((g) => {
                  const isOn = selected.has(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggle(g.id)}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                      style={{
                        background: isOn
                          ? "var(--orange-gradient)"
                          : "var(--card)",
                        color: isOn ? "#fff" : "var(--foreground-secondary)",
                        border: isOn ? "none" : "1px solid var(--border)",
                      }}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </FormField>

            {error && (
              <div
                className="rounded-xl px-3 py-2 text-xs"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={isPending || !email}
              >
                {isPending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
      </Modal>
    </>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { acceptInviteAction, type InviteAcceptState } from "./actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, isPending] = useActionState<InviteAcceptState, FormData>(
    acceptInviteAction,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      <FormField label="Email">
        <Input value={email} disabled readOnly />
      </FormField>

      <FormField label="Your full name" required>
        <Input name="full_name" required placeholder="Alice Smith" />
      </FormField>

      <FormField
        label="Choose a password"
        required
        hint="Minimum 12 characters. Use a passphrase you'll remember."
      >
        <Input
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
        />
      </FormField>

      <div className="rounded-xl border border-[color:var(--orange)]/30 bg-[color:var(--orange-light)] px-4 py-3 text-xs text-[color:var(--orange-dark)]">
        <strong>Next step:</strong> after setting your password you&apos;ll set
        up two-factor authentication. This is mandatory for all Carrot Chase
        accounts because we process children&apos;s data.
      </div>

      {state.error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full justify-center">
        {isPending ? "Creating account…" : "Create account →"}
      </Button>
    </form>
  );
}

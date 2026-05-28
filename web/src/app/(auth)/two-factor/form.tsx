"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/input";
import type { TwoFactorState } from "./actions";

type Props = {
  factorId: string;
  action: (
    prev: TwoFactorState | undefined,
    formData: FormData,
  ) => Promise<TwoFactorState>;
};

export function TwoFactorForm({ factorId, action }: Props) {
  const [state, formAction, isPending] = useActionState<TwoFactorState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="factorId" value={factorId} />
      <FormField label="Authenticator code" required>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          required
          className="block w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-[color:var(--orange)] focus:bg-white"
        />
      </FormField>

      {state.error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full justify-center">
        {isPending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}

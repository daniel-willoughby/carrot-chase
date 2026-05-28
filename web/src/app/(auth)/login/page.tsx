"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--foreground)]">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Use the email and password from your invitation.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <FormField label="Email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </FormField>

        <FormField label="Password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </FormField>

        {state.error && (
          <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
            {state.error}
          </div>
        )}

        <Button type="submit" disabled={isPending} className="w-full justify-center">
          {isPending ? "Signing in…" : "Sign in →"}
        </Button>

        <p className="text-center text-xs text-[color:var(--muted)]">
          2FA is required for all accounts. You will set it up on first login.
        </p>
      </form>
    </div>
  );
}

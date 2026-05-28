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
    <>
      <h2 className="text-[26px] font-extrabold tracking-tight">Sign in</h2>
      <p
        className="mb-8 mt-1.5 text-sm"
        style={{ color: "var(--muted)" }}
      >
        Welcome back. Sign in to your account.
      </p>

      <form action={formAction} className="space-y-4">
        <FormField label="Email address" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </FormField>

        <FormField label="Password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </FormField>

        {state.error && (
          <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
            {state.error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="w-full justify-center"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>

        <p
          className="text-center text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          Two-factor authentication is required for all accounts.
        </p>
      </form>
    </>
  );
}

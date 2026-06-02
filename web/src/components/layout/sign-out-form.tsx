"use client";

import { signOutAction } from "@/app/auth/actions";
import { clearQueue } from "@/lib/offline/result-queue";

/**
 * Sign-out wrapper that wipes locally-cached personal data (the IndexedDB
 * offline result queue) before ending the session. On a shared school device
 * this stops children's names/times lingering in the browser after a user
 * signs out. Clearing is best-effort and never blocks the logout itself.
 */
export function SignOutForm({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await clearQueue();
    } catch {
      // never block logout on cache-clearing
    }
    await signOutAction();
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type TwoFactorState = { error?: string };

export async function verifyTwoFactorAction(
  _prev: TwoFactorState | undefined,
  formData: FormData,
): Promise<TwoFactorState> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!factorId) return { error: "Missing factor. Refresh and try again." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the six-digit code." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) {
    return { error: "That code didn't match. Try again." };
  }

  // Session is now AAL2 — proxy will allow access.
  redirect("/dashboard");
}

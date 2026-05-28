"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EnrolmentState = { error?: string };

export async function verifyEnrolmentAction(
  _prev: EnrolmentState | undefined,
  formData: FormData,
): Promise<EnrolmentState> {
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

  // Factor is now verified and the session is AAL2.
  redirect("/dashboard");
}

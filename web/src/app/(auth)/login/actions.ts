"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are both required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Generic message — do not leak whether the email exists.
    return { error: "Invalid email or password." };
  }

  // Record the sign-in. The session is now established, so the deferred
  // audit write (after the response) still carries the user's identity.
  await logAuditEvent(supabase, { action: "auth.login", metadata: { email } });

  // Successful password auth. The proxy will redirect to /two-factor (challenge)
  // or /two-factor/enrol depending on whether a TOTP factor exists.
  redirect("/dashboard");
}

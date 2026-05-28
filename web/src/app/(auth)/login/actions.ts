"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // Successful password auth. The proxy will redirect to /two-factor (challenge)
  // or /two-factor/enrol depending on whether a TOTP factor exists.
  redirect("/dashboard");
}

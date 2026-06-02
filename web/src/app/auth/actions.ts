"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export async function signOutAction() {
  const supabase = await createClient();

  // Audit the logout BEFORE signing out. The log_audit_event RPC records
  // auth.uid(), which is null once the session is revoked — and a deferred
  // (after-response) write would run after signOut for the same reason — so
  // this is done inline. Failure is swallowed so it can never block logout.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc("log_audit_event", {
        p_action: "auth.logout",
        p_metadata: { email: user.email } as Json,
      });
    }
  } catch {
    // never block logout on an audit write
  }

  await supabase.auth.signOut();
  redirect("/login");
}

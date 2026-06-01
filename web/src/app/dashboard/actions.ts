"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Wipe the caller's demo data — clears results, flips events back to
 * scheduled, and resets per-runner aggregates. Authorisation is enforced
 * inside the SQL function (must be a @demo.carrotchase.com user with an
 * organisation_id). See supabase/migrations/0008_reset_demo_data.sql.
 */
export async function resetDemoDataAction(): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  // reset_demo_data was added in migration 0008 after the last type-gen run.
  // Cast to a permissive shape until `supabase gen types typescript --linked`
  // is re-run — same pattern used in lib/audit.ts for log_audit_event.
  const rpc = supabase.rpc as unknown as (fn: string) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("reset_demo_data");
  if (error) {
    console.error("[reset-demo] rpc error:", error);
    return { error: error.message };
  }
  // Pretty much every page reads from results / events / runners, so
  // revalidate the whole dashboard tree.
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

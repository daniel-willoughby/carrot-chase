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
  const { error } = await supabase.rpc("reset_demo_data");
  if (error) {
    console.error("[reset-demo] rpc error:", error);
    return { error: error.message };
  }
  // Pretty much every page reads from results / events / runners, so
  // revalidate the whole dashboard tree.
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

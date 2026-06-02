"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type EraseState = { error?: string; ok?: boolean };

/**
 * Permanently erase a runner and all of their personal data — the GDPR
 * right-to-erasure (Article 17) action.
 *
 * Unlike "Remove runner" (a soft delete that keeps history), this is a HARD
 * delete: the runner row is destroyed and the ON DELETE CASCADE foreign keys
 * take their results, event attendance, and group memberships with it. There
 * is no undo.
 *
 * Restricted to super admins. The erasure itself is audited INLINE (not via
 * the deferred after() helper) so the compliance record is guaranteed to be
 * written before the data is destroyed — the audit row keeps the actor, the
 * runner's name/cc_id, and a timestamp, which is exactly what an erasure log
 * should retain.
 */
export async function eraseRunnerAction(runnerId: string): Promise<EraseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return { error: "Only a super admin can permanently erase a runner." };
  }

  // Capture identifying details for the audit record before destroying them.
  const { data: target } = await supabase
    .from("runners")
    .select("full_name, cc_id, organisation_id")
    .eq("id", runnerId)
    .single();
  if (!target) return { error: "Runner not found." };

  // Write the audit record inline and confirm it persisted — we do NOT want a
  // permanent deletion with no trace if a deferred write were to fail.
  const { error: auditError } = await supabase.rpc("log_audit_event", {
    p_action: "runner.erase",
    p_target_table: "runners",
    p_target_id: runnerId,
    p_metadata: {
      full_name: target.full_name,
      cc_id: target.cc_id,
      organisation_id: target.organisation_id,
    } as Json,
  });
  if (auditError) {
    console.error("[runners] erase audit failed, aborting:", auditError);
    return { error: "Could not record the erasure in the audit log — aborted." };
  }

  // Hard delete. runner_super_admin_all RLS permits this; FK cascades remove
  // results, event_attendance and runner_groups automatically.
  const { error, count } = await supabase
    .from("runners")
    .delete({ count: "exact" })
    .eq("id", runnerId);

  if (error) {
    console.error("[runners] erase error:", error);
    return { error: error.message };
  }
  if (!count) return { error: "Nothing was erased (already removed?)." };

  revalidatePath("/dashboard/school/members");
  revalidatePath("/dashboard/super");
  revalidatePath("/dashboard/school");
  return { ok: true };
}

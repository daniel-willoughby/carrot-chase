import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Record a sensitive action in the audit log.
 *
 * Server-side only — call this from server actions, never from the browser.
 * Failures are logged but never thrown, so an audit-log glitch can't break the
 * primary action.
 *
 * Cast: `log_audit_event` is added by migration 0004 and only appears in the
 * generated Database types after `supabase gen types typescript --linked` is
 * re-run. We cast to a permissive shape so the build stays green until then.
 */
export async function logAuditEvent(
  supabase: SupabaseClient<Database>,
  args: {
    action: string;
    targetTable?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  type AuditRpc = (
    fn: "log_audit_event",
    params: {
      p_action: string;
      p_target_table?: string;
      p_target_id?: string;
      p_metadata?: Record<string, unknown>;
    },
  ) => Promise<{ error: { message: string } | null }>;
  const rpc = supabase.rpc as unknown as AuditRpc;

  const { error } = await rpc("log_audit_event", {
    p_action: args.action,
    p_target_table: args.targetTable,
    p_target_id: args.targetId,
    p_metadata: args.metadata ?? {},
  });
  if (error) {
    console.warn("[audit] failed to log event:", args.action, error.message);
  }
}

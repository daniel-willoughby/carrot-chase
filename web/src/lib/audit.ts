import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

/**
 * Record a sensitive action in the audit log.
 *
 * Server-side only — call this from server actions, never from the browser.
 * Failures are logged but never thrown, so an audit-log glitch can't break the
 * primary action.
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
  // Audit-log failures must never bubble up — they would mask the primary
  // action's outcome and (worse) crash the server action with an
  // uncaught exception in the React Server Component. Anything thrown
  // here is logged and swallowed.
  try {
    const { error } = await supabase.rpc("log_audit_event", {
      p_action: args.action,
      p_target_table: args.targetTable,
      p_target_id: args.targetId,
      p_metadata: (args.metadata ?? {}) as Json,
    });
    if (error) {
      console.warn("[audit] failed to log event:", args.action, error.message);
    }
  } catch (err) {
    console.warn(
      "[audit] threw while logging event:",
      args.action,
      err instanceof Error ? err.message : String(err),
    );
  }
}

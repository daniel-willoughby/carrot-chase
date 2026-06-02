import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

/**
 * Record a sensitive action in the audit log.
 *
 * Server-side only — call this from server actions, never from the browser.
 *
 * The audit write is scheduled with `after()` so it runs *after* the response
 * is sent, never on the request's critical path. Audit logging is a side
 * effect that must not add latency to (or be able to fail) the primary
 * action — keeping it out of the critical path also avoids the extra Supabase
 * round-trip pushing a cold serverless function over its time budget. Failures
 * are logged and swallowed.
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
  after(async () => {
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
  });
}

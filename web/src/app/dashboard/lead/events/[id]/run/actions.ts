"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Finisher = {
  runner_id: string;
  finish_seconds: number | null; // null = DNF/DNS
  adjusted_seconds?: number | null;
};

export async function commitResultsAction(
  eventId: string,
  finishers: Finisher[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // The SQL function `commit_event_results` reads `raw_time_seconds` from
  // each finisher payload. Translate from our client-side `finish_seconds`
  // (kept for clarity) before invoking the RPC.
  const payload = finishers.map((f) => ({
    runner_id: f.runner_id,
    raw_time_seconds: f.finish_seconds,
  }));

  const { error } = await supabase.rpc("commit_event_results", {
    p_event_id: eventId,
    p_finishers: payload,
  });

  if (error) {
    console.error("[run-event] commit error:", error);
    return { error: error.message };
  }

  // commit_event_results already marks the event completed inside the
  // transaction — no need to do it again here. (Leaving the second update
  // in place was the source of an inconsistent state where a failed RPC
  // still flipped the event to "completed" with no rows in results.)

  revalidatePath(`/dashboard/lead/events/${eventId}`);
  revalidatePath("/dashboard/lead/events");
  revalidatePath("/dashboard/lead");
  redirect(`/dashboard/lead/events/${eventId}/results`);
}

export async function addLateArrivalAction(
  groupId: string,
  name: string,
): Promise<{ error?: string; runner?: { id: string; full_name: string; current_level: number; streak_count: number; personal_best_seconds: number | null } }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Leads can't INSERT into public.runners directly under the runner_*
  // RLS policies — this RPC is a SECURITY DEFINER that validates the
  // caller actually leads the group and then does the insert + join in
  // one atomic call. See supabase/migrations/0006_add_late_arrival.sql.
  const { data, error } = await supabase
    .rpc("add_late_arrival", {
      p_group_id: groupId,
      p_full_name: trimmed,
    });

  if (error) {
    console.error("[late-arrival] rpc error:", error);
    return { error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "Could not add runner." };

  return {
    runner: {
      id: row.id,
      full_name: row.full_name,
      current_level: row.current_level,
      streak_count: row.streak_count,
      personal_best_seconds: row.personal_best_seconds,
    },
  };
}

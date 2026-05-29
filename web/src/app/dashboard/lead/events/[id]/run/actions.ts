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

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id)
    return { error: "Could not resolve your organisation." };

  const { data: runner, error: runnerErr } = await supabase
    .from("runners")
    .insert({
      organisation_id: profile.organisation_id,
      full_name: trimmed,
      current_level: 99,
      streak_count: 0,
    })
    .select("id, full_name, current_level, streak_count, personal_best_seconds")
    .single();

  if (runnerErr || !runner) {
    console.error("[late-arrival] runner insert error:", runnerErr);
    return { error: runnerErr?.message ?? "Could not add runner." };
  }

  const { error: linkErr } = await supabase
    .from("runner_groups")
    .insert({ runner_id: runner.id, group_id: groupId });

  if (linkErr) {
    console.error("[late-arrival] runner_groups insert error:", linkErr);
    return { error: linkErr.message };
  }

  return { runner };
}

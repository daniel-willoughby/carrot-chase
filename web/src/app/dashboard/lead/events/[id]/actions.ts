"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

/**
 * Cancel a scheduled event. Lead must lead the event's group (or be a
 * school / super admin). We don't soft-delete here — cancelled events
 * stay visible in the events table with the "Cancelled" pill so the
 * roster knows it didn't run.
 *
 * The lead's RLS UPDATE policy on events covers their own groups, so
 * the policy enforces ownership for us. We just verify the event isn't
 * already completed (cancelling a completed event would lose history).
 */
export async function cancelEventAction(
  eventId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found." };
  if (event.status === "completed") {
    return { error: "Completed events can't be cancelled." };
  }

  const { error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId);

  if (error) {
    console.error("[events] cancel error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "event.cancel",
    targetTable: "events",
    targetId: eventId,
  });

  revalidatePath("/dashboard/lead/events");
  revalidatePath("/dashboard/lead");
  revalidatePath(`/dashboard/lead/events/${eventId}`);
  redirect("/dashboard/lead/events");
}

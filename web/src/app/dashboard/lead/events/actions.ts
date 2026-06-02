"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type EventFormat = Database["public"]["Enums"]["event_format"];

export type EventActionState = { error?: string; ok?: boolean };

const VALID_FORMATS: EventFormat[] = ["scratch", "handicap", "relay"];

export async function createEventAction(
  _prev: EventActionState | undefined,
  formData: FormData,
): Promise<EventActionState> {
  const group_id = String(formData.get("group_id") ?? "").trim();
  const course_id = String(formData.get("course_id") ?? "").trim();
  const format = String(formData.get("format") ?? "handicap") as EventFormat;
  const scheduled_at = String(formData.get("scheduled_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const term = String(formData.get("term") ?? "").trim() || null;

  if (!group_id) return { error: "Pick a group." };
  if (!course_id) return { error: "Pick a course." };
  if (!VALID_FORMATS.includes(format))
    return { error: "Invalid race format." };
  if (!scheduled_at) return { error: "Pick a date and time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      group_id,
      course_id,
      lead_id: user.id,
      format,
      scheduled_at: new Date(scheduled_at).toISOString(),
      notes,
      term,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[events] create error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/lead/events");
  revalidatePath("/dashboard/lead");
  redirect(`/dashboard/lead/events/${event!.id}`);
}

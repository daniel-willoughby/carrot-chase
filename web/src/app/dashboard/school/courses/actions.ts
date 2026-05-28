"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CourseActionState = { error?: string; ok?: boolean };

export async function createCourseAction(
  _prev: CourseActionState | undefined,
  formData: FormData,
): Promise<CourseActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const distanceRaw = String(formData.get("distance_metres") ?? "").trim();
  const distance = Number(distanceRaw);

  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(distance) || distance < 50 || distance > 50000)
    return { error: "Distance must be between 50 and 50000 metres." };

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

  const { error } = await supabase.from("courses").insert({
    name,
    distance_metres: Math.round(distance),
    organisation_id: profile.organisation_id,
    is_platform_preset: false,
  });

  if (error) {
    console.error("[courses] create error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/school/courses");
  return { ok: true };
}

export async function deleteCourseAction(courseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", courseId)
    .eq("is_platform_preset", false); // safety: can't soft-delete platform presets

  if (error) {
    console.error("[courses] delete error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/school/courses");
  return { ok: true };
}

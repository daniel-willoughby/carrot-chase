"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type GroupType = Database["public"]["Enums"]["group_type"];

export type GroupActionState = { error?: string; ok?: boolean };

const VALID_TYPES: GroupType[] = [
  "year",
  "class",
  "club",
  "pe_class",
  "breakfast_club",
  "custom",
];

export async function createGroupAction(
  _prev: GroupActionState | undefined,
  formData: FormData,
): Promise<GroupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const group_type = String(formData.get("group_type") ?? "custom") as GroupType;

  if (!name) return { error: "Group name is required." };
  if (!VALID_TYPES.includes(group_type))
    return { error: "Invalid group type." };

  const supabase = await createClient();

  // School Admin's organisation_id is required. Look it up rather than trust client.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return {
      error: "Your account is not linked to an organisation.",
    };
  }

  const { error } = await supabase.from("groups").insert({
    organisation_id: profile.organisation_id,
    name,
    group_type,
  });

  if (error) {
    console.error("[groups] create error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/school/groups");
  revalidatePath("/dashboard/school");
  return { ok: true };
}

export async function archiveGroupAction(groupId: string) {
  const supabase = await createClient();
  // Soft delete (US-10) — preserves event history.
  const { error } = await supabase
    .from("groups")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) {
    console.error("[groups] archive error:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/school/groups");
  return { ok: true };
}

export async function restoreGroupAction(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({ deleted_at: null })
    .eq("id", groupId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/school/groups");
  return { ok: true };
}

export async function assignLeadAction(groupId: string, leadId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_leads")
    .insert({ group_id: groupId, lead_id: leadId });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/school/groups/${groupId}`);
  return { ok: true };
}

export async function unassignLeadAction(groupId: string, leadId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_leads")
    .delete()
    .eq("group_id", groupId)
    .eq("lead_id", leadId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/school/groups/${groupId}`);
  return { ok: true };
}

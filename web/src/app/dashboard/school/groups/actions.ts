"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
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

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      organisation_id: profile.organisation_id,
      name,
      group_type,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[groups] create error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "group.create",
    targetTable: "groups",
    targetId: group?.id,
    metadata: { name, group_type },
  });

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

  await logAuditEvent(supabase, {
    action: "group.archive",
    targetTable: "groups",
    targetId: groupId,
  });

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

  await logAuditEvent(supabase, {
    action: "group.restore",
    targetTable: "groups",
    targetId: groupId,
  });

  revalidatePath("/dashboard/school/groups");
  return { ok: true };
}

export async function assignLeadAction(groupId: string, leadId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_leads")
    .insert({ group_id: groupId, lead_id: leadId });
  if (error) return { error: error.message };

  await logAuditEvent(supabase, {
    action: "group.lead_assign",
    targetTable: "group_leads",
    targetId: groupId,
    metadata: { lead_id: leadId },
  });

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

  await logAuditEvent(supabase, {
    action: "group.lead_unassign",
    targetTable: "group_leads",
    targetId: groupId,
    metadata: { lead_id: leadId },
  });

  revalidatePath(`/dashboard/school/groups/${groupId}`);
  return { ok: true };
}

/**
 * Create an invitation for a new Lead. The school admin's RLS INSERT
 * policy enforces:
 *   • invited_role in ('lead', 'school_admin')
 *   • organisation_id matches the caller's org
 *   • invited_by = auth.uid()
 *
 * MVP: only writes the invitations row. The Resend email send is logged
 * as a follow-up (#45 in the task tracker mentions this). Sending the
 * actual email will compose the magic link from `invitations.token`.
 */
export async function inviteLeadAction(
  email: string,
  groupIds: string[],
): Promise<GroupActionState> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
    return { error: "Enter a valid email address." };
  }

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
  if (!profile?.organisation_id) {
    return { error: "Could not resolve your organisation." };
  }

  const { error } = await supabase.from("invitations").insert({
    email: trimmedEmail,
    invited_role: "lead",
    organisation_id: profile.organisation_id,
    group_assignments: groupIds,
    invited_by: user.id,
  });

  if (error) {
    console.error("[invite-lead] insert error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "invitation.create",
    targetTable: "invitations",
    metadata: {
      email: trimmedEmail,
      invited_role: "lead",
      group_count: groupIds.length,
    },
  });

  revalidatePath("/dashboard/school/groups");
  return { ok: true };
}

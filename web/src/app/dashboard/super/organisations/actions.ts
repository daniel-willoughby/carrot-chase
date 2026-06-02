"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email/send-invite";
import type { Database } from "@/lib/supabase/database.types";

type OrgType = Database["public"]["Enums"]["org_type"];
type OrgStatus = Database["public"]["Enums"]["org_status"];

export type OrgActionState = {
  error?: string;
  ok?: boolean;
  emailWarning?: string;
};

const VALID_TYPES: OrgType[] = ["school", "business", "club", "distributor", "mat"];

export async function createOrganisationAction(
  _prev: OrgActionState | undefined,
  formData: FormData,
): Promise<OrgActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const org_type = String(formData.get("org_type") ?? "school") as OrgType;
  const location = String(formData.get("location") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!VALID_TYPES.includes(org_type))
    return { error: "Invalid organisation type." };

  const supabase = await createClient();
  const { data: org, error } = await supabase
    .from("organisations")
    .insert({ name, org_type, location, status: "active" })
    .select("id")
    .single();

  if (error) {
    console.error("[organisations] create error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "organisation.create",
    targetTable: "organisations",
    targetId: org?.id,
    metadata: { name, org_type, location },
  });

  revalidatePath("/dashboard/super/organisations");
  revalidatePath("/dashboard/super");
  return { ok: true };
}

export async function setOrganisationStatusAction(
  orgId: string,
  status: OrgStatus,
) {
  const supabase = await createClient();

  // Capture previous status + name for the audit trail (so the log reads
  // "Hampton Primary School: active → suspended" rather than just the ids).
  const { data: prev } = await supabase
    .from("organisations")
    .select("status, name")
    .eq("id", orgId)
    .single();

  const { error } = await supabase
    .from("organisations")
    .update({ status })
    .eq("id", orgId);

  if (error) {
    console.error("[organisations] status update error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "organisation.status_change",
    targetTable: "organisations",
    targetId: orgId,
    metadata: {
      organisation: prev?.name ?? null,
      from: prev?.status ?? null,
      to: status,
    },
  });

  revalidatePath("/dashboard/super/organisations");
  return { ok: true };
}

/**
 * Edit an organisation's core details (name, type, location). Super Admin only
 * — enforced by the org_super_admin_all RLS policy. Audited as
 * organisation.update with a record of which fields changed.
 */
export async function updateOrganisationAction(
  orgId: string,
  _prev: OrgActionState | undefined,
  formData: FormData,
): Promise<OrgActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const org_type = String(formData.get("org_type") ?? "") as OrgType;
  const location = String(formData.get("location") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!VALID_TYPES.includes(org_type))
    return { error: "Invalid organisation type." };

  const supabase = await createClient();

  // Capture previous values so the audit trail records the actual change.
  const { data: prev } = await supabase
    .from("organisations")
    .select("name, org_type, location")
    .eq("id", orgId)
    .single();

  const { error } = await supabase
    .from("organisations")
    .update({ name, org_type, location })
    .eq("id", orgId);

  if (error) {
    console.error("[organisations] update error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "organisation.update",
    targetTable: "organisations",
    targetId: orgId,
    metadata: {
      organisation: name,
      ...(prev?.name !== name ? { name_from: prev?.name, name_to: name } : {}),
      ...(prev?.org_type !== org_type
        ? { type_from: prev?.org_type, type_to: org_type }
        : {}),
      ...(prev?.location !== location
        ? { location_from: prev?.location ?? null, location_to: location }
        : {}),
    },
  });

  revalidatePath("/dashboard/super/organisations");
  revalidatePath(`/dashboard/super/organisations/${orgId}`);
  return { ok: true };
}

/**
 * Invite a School Admin to a specific organisation. Super Admin only
 * (invitation_super_admin_all RLS). Writes the invitation row and emails the
 * sign-up link; email failure is non-fatal (the row is committed regardless).
 */
export async function inviteAdminAction(
  orgId: string,
  _prev: OrgActionState | undefined,
  formData: FormData,
): Promise<OrgActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", orgId)
    .single();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email,
      invited_role: "school_admin",
      organisation_id: orgId,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error) {
    console.error("[invite-admin] insert error:", error);
    return { error: error.message };
  }

  await logAuditEvent(supabase, {
    action: "invitation.create",
    targetTable: "invitations",
    metadata: { email, invited_role: "school_admin", organisation: org?.name ?? null },
  });

  const { error: emailErr } = await sendInviteEmail({
    to: email,
    orgName: org?.name ?? "your organisation",
    role: "school_admin",
    token: invitation!.token,
  });

  revalidatePath("/dashboard/super/organisations");

  if (emailErr) {
    return {
      ok: true,
      emailWarning: "Invitation saved but the email could not be sent.",
    };
  }
  return { ok: true };
}

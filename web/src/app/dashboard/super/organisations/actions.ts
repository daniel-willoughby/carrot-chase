"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import type { Database } from "@/lib/supabase/database.types";

type OrgType = Database["public"]["Enums"]["org_type"];
type OrgStatus = Database["public"]["Enums"]["org_status"];

export type OrgActionState = { error?: string; ok?: boolean };

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

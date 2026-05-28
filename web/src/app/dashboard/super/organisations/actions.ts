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

  // Capture previous status for the audit trail
  const { data: prev } = await supabase
    .from("organisations")
    .select("status")
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
    metadata: { from: prev?.status ?? null, to: status },
  });

  revalidatePath("/dashboard/super/organisations");
  return { ok: true };
}

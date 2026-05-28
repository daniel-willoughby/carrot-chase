"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MemberActionState = { error?: string; ok?: boolean; count?: number };

async function getCurrentOrgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, orgId: null as string | null, userError: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return {
      supabase,
      orgId: null,
      userError: "Your account is not linked to an organisation.",
    };
  }
  return { supabase, orgId: profile.organisation_id, userError: undefined };
}

export async function createRunnerAction(
  _prev: MemberActionState | undefined,
  formData: FormData,
): Promise<MemberActionState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const year_group = String(formData.get("year_group") ?? "").trim() || null;
  const group_id = String(formData.get("group_id") ?? "").trim() || null;

  if (!full_name) return { error: "Name is required." };

  const { supabase, orgId, userError } = await getCurrentOrgId();
  if (userError || !orgId) return { error: userError ?? "Unknown error." };

  const { data: runner, error } = await supabase
    .from("runners")
    .insert({
      organisation_id: orgId,
      full_name,
      year_group,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[members] create error:", error);
    return { error: error.message };
  }

  // Optional initial group assignment.
  if (group_id && runner) {
    await supabase.from("runner_groups").insert({
      runner_id: runner.id,
      group_id,
    });
  }

  revalidatePath("/dashboard/school/members");
  return { ok: true };
}

export type CsvRow = {
  full_name: string;
  year_group: string | null;
  group_name: string | null;
};

export async function importRunnersAction(
  rows: CsvRow[],
  defaultGroupId: string | null,
): Promise<MemberActionState> {
  if (!rows || rows.length === 0) return { error: "No rows to import." };

  const { supabase, orgId, userError } = await getCurrentOrgId();
  if (userError || !orgId) return { error: userError ?? "Unknown error." };

  // Fetch groups in this org so we can match by name.
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .is("deleted_at", null);

  const groupsByName = new Map<string, string>();
  for (const g of groups ?? []) {
    groupsByName.set(g.name.toLowerCase(), g.id);
  }

  // Bulk insert runners.
  const inserts = rows.map((r) => ({
    organisation_id: orgId,
    full_name: r.full_name,
    year_group: r.year_group,
  }));

  const { data: inserted, error } = await supabase
    .from("runners")
    .insert(inserts)
    .select("id, full_name");

  if (error) {
    console.error("[members] csv import error:", error);
    return { error: error.message };
  }

  // Assign to groups (default and/or per-row).
  const memberships: { runner_id: string; group_id: string }[] = [];
  inserted?.forEach((runner, idx) => {
    const row = rows[idx];
    const rowGroupId = row.group_name
      ? groupsByName.get(row.group_name.toLowerCase())
      : null;
    const groupId = rowGroupId ?? defaultGroupId;
    if (groupId) memberships.push({ runner_id: runner.id, group_id: groupId });
  });

  if (memberships.length > 0) {
    await supabase.from("runner_groups").insert(memberships);
  }

  revalidatePath("/dashboard/school/members");
  revalidatePath("/dashboard/school/groups");
  return { ok: true, count: inserted?.length ?? 0 };
}

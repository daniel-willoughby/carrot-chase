import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/runners/[id]/export
 *
 * The GDPR right-of-access / data-portability endpoint (Articles 15 & 20):
 * returns everything held about a single runner as a downloadable JSON file.
 *
 * Authorisation: a super admin, or the school admin of the runner's own
 * organisation. All queries run through the caller's RLS-scoped client, so
 * the data layer independently enforces the boundary too.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role, organisation_id")
    .eq("id", user.id)
    .single();

  const { data: runner } = await supabase
    .from("runners")
    .select(
      "id, cc_id, full_name, year_group, current_level, personal_best_seconds, streak_count, parent_id, organisation_id, created_at, updated_at, deleted_at",
    )
    .eq("id", id)
    .single();

  if (!runner) {
    return NextResponse.json({ error: "Runner not found." }, { status: 404 });
  }

  const isSuper = viewer?.role === "super_admin";
  const isOwningSchoolAdmin =
    viewer?.role === "school_admin" &&
    viewer.organisation_id === runner.organisation_id;
  if (!isSuper && !isOwningSchoolAdmin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const [{ data: memberships }, { data: attendance }, { data: results }] =
    await Promise.all([
      supabase
        .from("runner_groups")
        .select("group_id, added_at, groups(name, group_type)")
        .eq("runner_id", id),
      supabase
        .from("event_attendance")
        .select("event_id, status, recorded_at")
        .eq("runner_id", id),
      supabase
        .from("results")
        .select(
          "event_id, finish_position, raw_time_seconds, adjusted_time_seconds, is_personal_best, is_most_improved, level_before, level_after, level_change, medal, finished_at",
        )
        .eq("runner_id", id),
    ]);

  const export_payload = {
    exported_at: new Date().toISOString(),
    exported_by: { id: user.id, role: viewer?.role ?? null },
    note: "GDPR data export for a single runner. Personal data held by Carrot Chase.",
    runner,
    group_memberships: memberships ?? [],
    event_attendance: attendance ?? [],
    results: results ?? [],
  };

  const safeName = (runner.full_name || "runner")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `carrot-chase-export-${safeName || runner.id}.json`;

  return new NextResponse(JSON.stringify(export_payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

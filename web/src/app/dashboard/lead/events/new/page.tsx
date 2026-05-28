import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { EventWizard } from "./wizard";

export default async function NewEventPage() {
  const supabase = await createClient();

  // Groups visible to this lead (via group_leads + RLS).
  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id, groups!inner(id, name, deleted_at)")
    .order("assigned_at", { ascending: false });

  const groupList = (leadGroups ?? [])
    .map((row) => row.groups)
    .filter((g) => g && !g.deleted_at);

  // Member counts + roster per group (roster powers the Review step).
  const groupIds = groupList.map((g) => g.id);
  const { data: memberships } = groupIds.length
    ? await supabase
        .from("runner_groups")
        .select(
          "group_id, runners!inner(id, full_name, current_level, personal_best_seconds, deleted_at)",
        )
        .in("group_id", groupIds)
    : { data: [] };

  const rostersByGroup = new Map<
    string,
    { id: string; name: string; level: number; pb: number | null }[]
  >();
  for (const m of memberships ?? []) {
    const r = m.runners;
    if (!r || r.deleted_at) continue;
    const list = rostersByGroup.get(m.group_id) ?? [];
    list.push({
      id: r.id,
      name: r.full_name,
      level: r.current_level,
      pb: r.personal_best_seconds,
    });
    rostersByGroup.set(m.group_id, list);
  }

  const groups = groupList.map((g) => {
    const roster = rostersByGroup.get(g.id) ?? [];
    return {
      id: g.id,
      name: g.name,
      memberCount: roster.length,
      roster: roster.sort((a, b) => a.level - b.level),
    };
  });

  // Courses: platform presets + own org's custom courses (RLS handles scoping).
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, distance_metres, is_platform_preset")
    .is("deleted_at", null)
    .order("is_platform_preset", { ascending: false })
    .order("distance_metres");

  return (
    <div className="fade-in">
      <div className="mb-2 text-sm text-[color:var(--muted)]">
        <Link
          href="/dashboard/lead/events"
          className="hover:text-[color:var(--orange)]"
        >
          ← Back to events
        </Link>
      </div>

      <PageHeader
        title="New event"
        description="Set up a Carrot Chase session in two quick steps."
      />

      {groups.length === 0 ? (
        <EmptyState
          title="No groups assigned"
          description="Ask your School Admin to assign you to a group before creating an event."
        />
      ) : (
        <EventWizard groups={groups} courses={courses ?? []} />
      )}
    </div>
  );
}

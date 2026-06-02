import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { PageHeader } from "@/components/ui/page-header";
import { eventDate } from "@/lib/term";

const TYPE_LABEL: Record<string, string> = {
  year: "Year",
  class: "Class",
  pe_class: "PE Class",
  breakfast_club: "Breakfast Club",
  club: "Running Club",
  custom: "Custom",
};

export default async function LeadGroupsPage() {
  const supabase = await createClient();

  // RLS (group_leads_self_read) scopes this to the signed-in lead's rows.
  const { data: leadRows } = await supabase
    .from("group_leads")
    .select("group_id");
  const groupIds = [...new Set((leadRows ?? []).map((r) => r.group_id))];

  const { data: groups } = groupIds.length
    ? await supabase
        .from("groups")
        .select("id, name, group_type")
        .in("id", groupIds)
        .is("deleted_at", null)
        .order("name")
    : { data: [] as { id: string; name: string; group_type: string }[] };

  const ids = (groups ?? []).map((g) => g.id);

  // Members per group (for counts + an avatar preview).
  const { data: rgRows } = ids.length
    ? await supabase
        .from("runner_groups")
        .select("group_id, runners!inner(id, full_name, current_level, deleted_at)")
        .in("group_id", ids)
    : { data: [] as never[] };

  type RunnerLite = { id: string; full_name: string; current_level: number };
  const runnersByGroup = new Map<string, RunnerLite[]>();
  const countByGroup = new Map<string, number>();
  for (const id of ids) {
    runnersByGroup.set(id, []);
    countByGroup.set(id, 0);
  }
  for (const row of rgRows ?? []) {
    const r = row.runners as unknown as RunnerLite & { deleted_at: string | null };
    if (!r || r.deleted_at) continue;
    countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);
    const bucket = runnersByGroup.get(row.group_id);
    if (bucket && bucket.length < 5) {
      bucket.push({ id: r.id, full_name: r.full_name, current_level: r.current_level });
    }
  }

  // Last + next event per group.
  const { data: groupEvents } = ids.length
    ? await supabase
        .from("events")
        .select("group_id, scheduled_at, status")
        .in("group_id", ids)
        .is("deleted_at", null)
    : { data: [] as never[] };

  const lastByGroup = new Map<string, string | null>();
  const nextByGroup = new Map<string, string | null>();
  const nowMs = Date.now();
  for (const e of groupEvents ?? []) {
    const ts = new Date(e.scheduled_at).getTime();
    if (ts < nowMs) {
      const cur = lastByGroup.get(e.group_id);
      if (!cur || new Date(cur).getTime() < ts) lastByGroup.set(e.group_id, e.scheduled_at);
    } else if (e.status === "scheduled") {
      const cur = nextByGroup.get(e.group_id);
      if (!cur || new Date(cur).getTime() > ts) nextByGroup.set(e.group_id, e.scheduled_at);
    }
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="My Groups"
        description="The groups you lead. Manage rosters from Members and run sessions from Events."
      />

      {!groups || groups.length === 0 ? (
        <EmptyState
          icon="groups"
          title="No groups assigned yet"
          description="When a school admin assigns you to a group, it will appear here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {groups.map((g) => {
            const runners = runnersByGroup.get(g.id) ?? [];
            const count = countByGroup.get(g.id) ?? 0;
            const initial = g.name.trim()[0]?.toUpperCase() ?? "G";
            return (
              <Card key={g.id} className="flex flex-col">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold"
                    style={{ background: "var(--orange-light)", color: "var(--orange)" }}
                  >
                    {initial}
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ background: "var(--orange-light)", color: "var(--orange)" }}
                  >
                    {count} runner{count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mb-0.5 text-[15px] font-extrabold tracking-tight">
                  {g.name}
                </div>
                <div className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                  {TYPE_LABEL[g.group_type] ?? g.group_type}
                </div>
                {runners.length > 0 && (
                  <div className="mb-4">
                    <AvatarStack
                      runners={runners.map((r) => ({
                        id: r.id,
                        name: r.full_name,
                        level: r.current_level,
                      }))}
                      max={5}
                    />
                  </div>
                )}
                <div
                  className="mb-3 flex items-end justify-between text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  <div>
                    <div>Last event</div>
                    <div
                      className="mt-0.5 text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {lastByGroup.get(g.id) ? eventDate(lastByGroup.get(g.id)!) : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>Next event</div>
                    <div
                      className="mt-0.5 text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {nextByGroup.get(g.id) ? eventDate(nextByGroup.get(g.id)!) : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-auto">
                  <Link
                    href="/dashboard/lead/members"
                    className="rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
                    style={{ border: "1.5px solid var(--orange)", color: "var(--orange)" }}
                  >
                    View members
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

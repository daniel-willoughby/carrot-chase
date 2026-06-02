import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { LeadAssignment } from "./lead-assignment";
import { MemberAssignment } from "./member-assignment";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, group_type, deleted_at, organisation_id, created_at")
    .eq("id", id)
    .single();

  if (!group) notFound();

  // Members in this group.
  const { data: runnerGroups } = await supabase
    .from("runner_groups")
    .select("runner_id, runners(id, cc_id, full_name, current_level, year_group)")
    .eq("group_id", id);

  const members = (runnerGroups ?? [])
    .map((rg) => rg.runners)
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // Active runners in this org that aren't already in the group — the pool
  // the admin can add from. A runner can belong to multiple groups.
  const memberIds = new Set(members.map((r) => r.id));
  const { data: orgRunners } = await supabase
    .from("runners")
    .select("id, cc_id, full_name, current_level, year_group")
    .eq("organisation_id", group.organisation_id)
    .is("deleted_at", null);

  const availableRunners = (orgRunners ?? [])
    .filter((r) => !memberIds.has(r.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // Leads assigned.
  const { data: leadRows } = await supabase
    .from("group_leads")
    .select("lead_id, profiles(full_name, email)")
    .eq("group_id", id);

  // Available leads = profiles in this org with role 'lead' not yet assigned.
  const assignedIds = new Set((leadRows ?? []).map((l) => l.lead_id));
  const { data: orgLeads } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("organisation_id", group.organisation_id)
    .eq("role", "lead")
    .is("deleted_at", null);

  const availableLeads = (orgLeads ?? []).filter(
    (l) => !assignedIds.has(l.id),
  );

  return (
    <div className="fade-in">
      <div className="mb-2 text-sm text-[color:var(--muted)]">
        <Link
          href="/dashboard/school/groups"
          className="hover:text-[color:var(--orange)]"
        >
          ← All groups
        </Link>
      </div>

      <PageHeader
        title={group.name}
        description={
          <>
            {group.group_type.replace("_", " ")}
            {group.deleted_at && " · archived"}
          </>
        }
        actions={
          group.deleted_at ? (
            <Badge tone="warning">Archived</Badge>
          ) : (
            <Badge tone="success">Active</Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Members" value={members.length} tone="orange" />
        <StatCard label="Leads" value={(leadRows ?? []).length} tone="blue" />
        <StatCard label="Events" value="—" sub="E5 coming next" tone="success" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight">Members</h3>
            <Link
              href={`/dashboard/school/members?group=${id}`}
              className="text-sm font-semibold text-[color:var(--orange)] hover:underline"
            >
              All members →
            </Link>
          </div>
          <p className="mb-2 text-sm text-[color:var(--muted)]">
            Add or remove runners here — a runner can be in more than one group.
          </p>
          <MemberAssignment
            groupId={group.id}
            members={members}
            availableRunners={availableRunners}
          />
        </Card>

        <Card>
          <h3 className="text-lg font-bold tracking-tight">Leads</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Multi-lead assignment is supported (per US-09).
          </p>
          <LeadAssignment
            groupId={group.id}
            assigned={leadRows ?? []}
            availableLeads={availableLeads}
          />
        </Card>
      </div>
    </div>
  );
}

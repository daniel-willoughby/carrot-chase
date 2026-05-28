import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

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
    .select("runner_id, runners(cc_id, full_name, current_level, year_group)")
    .eq("group_id", id);

  const members = (runnerGroups ?? []).map((rg) => rg.runners).filter(Boolean);

  // Leads assigned.
  const { data: leadRows } = await supabase
    .from("group_leads")
    .select("lead_id, profiles(full_name, email)")
    .eq("group_id", id);

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
              Manage members →
            </Link>
          </div>
          {members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Import a CSV or add runners manually from the Members section."
            />
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {members.slice(0, 8).map((r) =>
                r ? (
                  <li
                    key={r.cc_id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <div className="font-semibold">{r.full_name}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {r.cc_id} · {r.year_group ?? "—"}
                      </div>
                    </div>
                    <Badge tone="orange">L{r.current_level}</Badge>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-bold tracking-tight">Leads</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Multi-lead assignment is supported (per US-09).
          </p>
          {(leadRows ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              No leads assigned yet. Invite a lead from the Members section
              once invitations are wired up.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(leadRows ?? []).map((l) =>
                l.profiles ? (
                  <li
                    key={l.lead_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-semibold">
                        {l.profiles.full_name || l.profiles.email}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {l.profiles.email}
                      </div>
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

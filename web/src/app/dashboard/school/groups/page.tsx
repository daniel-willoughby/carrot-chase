import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { NewGroupModal } from "./new-group-modal";
import { ArchiveButton } from "./archive-button";

const TYPE_LABEL: Record<string, string> = {
  year: "Year",
  class: "Class",
  pe_class: "PE",
  breakfast_club: "Breakfast",
  club: "Club",
  custom: "Custom",
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const supabase = await createClient();

  // Groups visible by RLS — only this user's org.
  const baseQuery = supabase
    .from("groups")
    .select("id, name, group_type, created_at, deleted_at")
    .order("created_at", { ascending: false });

  const { data: groups } = showArchived
    ? await baseQuery.not("deleted_at", "is", null)
    : await baseQuery.is("deleted_at", null);

  // Member counts per group via the junction.
  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: memberships } = groupIds.length
    ? await supabase
        .from("runner_groups")
        .select("group_id, runner_id")
        .in("group_id", groupIds)
    : { data: [] };

  const counts = new Map<string, number>();
  for (const m of memberships ?? []) {
    counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Groups"
        description="Year groups, classes, clubs and PE sessions"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={showArchived ? "/dashboard/school/groups" : "/dashboard/school/groups?archived=1"}
              className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground-secondary)] hover:bg-[color:var(--background-subtle)]"
            >
              {showArchived ? "← Active groups" : "View archived"}
            </Link>
            {!showArchived && <NewGroupModal />}
          </div>
        }
      />

      {!groups || groups.length === 0 ? (
        <EmptyState
          title={showArchived ? "No archived groups" : "No groups yet"}
          description={
            showArchived
              ? "Archived groups will appear here. They preserve event history."
              : "Create groups to organise runners by year, class, or club."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--background-subtle)] text-left text-xs uppercase tracking-[0.06em] text-[color:var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Members</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--background-subtle)]/50"
                  >
                    <td className="px-5 py-3 font-semibold">
                      <Link
                        href={`/dashboard/school/groups/${g.id}`}
                        className="hover:text-[color:var(--orange)]"
                      >
                        {g.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="neutral">
                        {TYPE_LABEL[g.group_type] ?? g.group_type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {counts.get(g.id) ?? 0}
                    </td>
                    <td className="px-5 py-3 text-[color:var(--muted)]">
                      {new Date(g.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <ArchiveButton
                          groupId={g.id}
                          archived={!!g.deleted_at}
                        />
                        <Link
                          href={`/dashboard/school/groups/${g.id}`}
                          className="rounded-full border border-[color:var(--border)] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground-secondary)] hover:bg-[color:var(--background-subtle)]"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

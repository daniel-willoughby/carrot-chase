import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
      <header className="mb-5 flex flex-col items-start justify-between gap-3 lg:mb-7 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
            Groups
          </h1>
          <p
            className="mt-1 text-[13px] sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            Year groups, classes, clubs and PE sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={showArchived ? "/dashboard/school/groups" : "/dashboard/school/groups?archived=1"}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground-secondary)",
            }}
          >
            {showArchived ? "← Active" : "Archived"}
          </Link>
          {!showArchived && <NewGroupModal />}
        </div>
      </header>

      {!groups || groups.length === 0 ? (
        <EmptyState
          icon="groups"
          title={showArchived ? "No archived groups" : "No groups yet"}
          description={
            showArchived
              ? "Archived groups will appear here. They preserve event history."
              : "Create groups to organise runners by year, class, or club."
          }
        />
      ) : (
        <>
          {/* Mobile: card rows */}
          <div className="flex flex-col gap-2 lg:hidden">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/dashboard/school/groups/${g.id}`}
                className="rounded-xl border p-3.5"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--card)",
                }}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="text-sm font-bold">{g.name}</div>
                  <Badge tone="neutral">
                    {TYPE_LABEL[g.group_type] ?? g.group_type}
                  </Badge>
                </div>
                <div
                  className="flex items-center justify-between text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  <span>
                    {counts.get(g.id) ?? 0} member
                    {(counts.get(g.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                  <span>
                    {new Date(g.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] bg-[color:var(--background-subtle)] text-left text-xs uppercase tracking-[0.06em] text-[color:var(--muted)]">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Members</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr
                      key={g.id}
                      className="tr-hover"
                      style={{ borderBottom: "1px solid var(--border)" }}
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
                      <td
                        className="px-5 py-3"
                        style={{ color: "var(--muted)" }}
                      >
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
                            className="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
                            style={{
                              border: "1px solid var(--border)",
                              background: "var(--card)",
                              color: "var(--foreground-secondary)",
                            }}
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
        </>
      )}
    </div>
  );
}

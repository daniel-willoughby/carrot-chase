import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CsvImportModal } from "./csv-import-modal";
import { NewRunnerModal } from "./new-runner-modal";

function levelTone(level: number): "success" | "blue" | "warning" | "orange" {
  // Lower = faster (golf-style handicap). Visualise as bands.
  if (level <= 20) return "success";
  if (level <= 50) return "blue";
  if (level <= 80) return "orange";
  return "warning";
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>;
}) {
  const { group: groupFilter, q: search } = await searchParams;
  const supabase = await createClient();

  // Groups for the import/add forms and the filter pill row.
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  // Runner query — RLS scopes to the user's org.
  let runnersQuery = supabase
    .from("runners")
    .select("id, cc_id, full_name, year_group, current_level, personal_best_seconds, streak_count")
    .is("deleted_at", null)
    .order("full_name");

  if (search) {
    runnersQuery = runnersQuery.ilike("full_name", `%${search}%`);
  }

  if (groupFilter) {
    // Get runner_ids for that group, then filter.
    const { data: members } = await supabase
      .from("runner_groups")
      .select("runner_id")
      .eq("group_id", groupFilter);
    const ids = (members ?? []).map((m) => m.runner_id);
    runnersQuery = runnersQuery.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: runners } = await runnersQuery;

  return (
    <div className="fade-in">
      <PageHeader
        title="Members"
        description="Runners in your organisation"
        actions={
          <div className="flex items-center gap-2">
            <CsvImportModal groups={groups ?? []} />
            <NewRunnerModal groups={groups ?? []} />
          </div>
        }
      />

      {/* Filter pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/school/members"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            !groupFilter
              ? "bg-[color:var(--foreground)] text-white"
              : "bg-white text-[color:var(--foreground-secondary)] border border-[color:var(--border)] hover:bg-[color:var(--background-subtle)]"
          }`}
        >
          All ({runners?.length ?? 0})
        </Link>
        {(groups ?? []).map((g) => (
          <Link
            key={g.id}
            href={`/dashboard/school/members?group=${g.id}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              groupFilter === g.id
                ? "bg-orange-gradient text-white"
                : "bg-white text-[color:var(--foreground-secondary)] border border-[color:var(--border)] hover:bg-[color:var(--background-subtle)]"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {!runners || runners.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Add runners individually, or import a CSV to populate your member list in bulk. Each runner gets a unique CC-XXXX ID."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--background-subtle)] text-left text-xs uppercase tracking-[0.06em] text-[color:var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Runner</th>
                  <th className="px-5 py-3 font-semibold">CC ID</th>
                  <th className="px-5 py-3 font-semibold">Year</th>
                  <th className="px-5 py-3 font-semibold">Level</th>
                  <th className="px-5 py-3 font-semibold">PB</th>
                  <th className="px-5 py-3 font-semibold">Streak</th>
                </tr>
              </thead>
              <tbody>
                {runners.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--background-subtle)]/50"
                  >
                    <td className="px-5 py-3 font-semibold">{r.full_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[color:var(--muted)]">
                      {r.cc_id}
                    </td>
                    <td className="px-5 py-3 text-[color:var(--foreground-secondary)]">
                      {r.year_group ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={levelTone(r.current_level)}>
                        Level {r.current_level}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[color:var(--foreground-secondary)]">
                      {r.personal_best_seconds
                        ? `${Math.floor(r.personal_best_seconds / 60)}:${String(
                            Math.round(r.personal_best_seconds % 60),
                          ).padStart(2, "0")}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-[color:var(--foreground-secondary)]">
                      {r.streak_count > 0 ? `🔥 ${r.streak_count}` : "—"}
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

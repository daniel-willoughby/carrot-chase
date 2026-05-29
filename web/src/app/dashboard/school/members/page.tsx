import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CsvImportModal } from "./csv-import-modal";
import { NewRunnerModal } from "./new-runner-modal";
import { levelColor, fmtSecs, posPoints } from "@/lib/theme/level";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>;
}) {
  const { group: groupFilter, q: search } = await searchParams;
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  let runnersQuery = supabase
    .from("runners")
    .select(
      "id, cc_id, full_name, year_group, current_level, personal_best_seconds, streak_count",
    )
    .is("deleted_at", null)
    .order("full_name");

  if (search) {
    runnersQuery = runnersQuery.ilike("full_name", `%${search}%`);
  }

  if (groupFilter) {
    const { data: members } = await supabase
      .from("runner_groups")
      .select("runner_id")
      .eq("group_id", groupFilter);
    const ids = (members ?? []).map((m) => m.runner_id);
    runnersQuery = runnersQuery.in(
      "id",
      ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
    );
  }

  const { data: runners } = await runnersQuery;
  const list = runners ?? [];

  // Aggregate term points per runner from results.
  const runnerIds = list.map((r) => r.id);
  const { data: results } = runnerIds.length
    ? await supabase
        .from("results")
        .select("runner_id, finish_position")
        .in("runner_id", runnerIds)
    : { data: [] as { runner_id: string; finish_position: number }[] };

  const pointsByRunner = new Map<string, number>();
  for (const r of results ?? []) {
    if (r.finish_position > 0) {
      pointsByRunner.set(
        r.runner_id,
        (pointsByRunner.get(r.runner_id) ?? 0) + posPoints(r.finish_position - 1),
      );
    }
  }

  return (
    <div className="fade-in">
      <header className="mb-5 flex flex-col items-start justify-between gap-3 lg:mb-7 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
            Members
          </h1>
          <p
            className="mt-1 text-[13px] sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            Runners in your organisation · {list.length} total
          </p>
        </div>
        <div className="flex w-full items-center gap-2 lg:w-auto">
          <a
            href="/runners-template.csv"
            download
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground-secondary)",
            }}
          >
            ↓ CSV Template
          </a>
          <CsvImportModal groups={groups ?? []} />
          <NewRunnerModal groups={groups ?? []} />
        </div>
      </header>

      {/* Search */}
      <form action="" className="mb-3 flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Search by name…"
          className="flex-1 rounded-full px-4 py-2 text-sm"
          style={{
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
        {groupFilter && (
          <input type="hidden" name="group" value={groupFilter} />
        )}
      </form>

      {/* Filter pills */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Link
          href={`/dashboard/school/members${search ? `?q=${encodeURIComponent(search)}` : ""}`}
          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          style={{
            background: !groupFilter
              ? "var(--foreground)"
              : "var(--card)",
            color: !groupFilter ? "#fff" : "var(--foreground-secondary)",
            border: !groupFilter ? "none" : "1px solid var(--border)",
          }}
        >
          All ({list.length})
        </Link>
        {(groups ?? []).map((g) => {
          const params = new URLSearchParams();
          params.set("group", g.id);
          if (search) params.set("q", search);
          return (
            <Link
              key={g.id}
              href={`/dashboard/school/members?${params.toString()}`}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                background:
                  groupFilter === g.id
                    ? "var(--orange-gradient)"
                    : "var(--card)",
                color:
                  groupFilter === g.id ? "#fff" : "var(--foreground-secondary)",
                border:
                  groupFilter === g.id ? "none" : "1px solid var(--border)",
              }}
            >
              {g.name}
            </Link>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="members"
          title="No members yet"
          description="Add runners individually, or import a CSV. Each runner gets a unique CC-XXXX ID."
        />
      ) : (
        <>
          {/* Mobile: card rows */}
          <div className="flex flex-col gap-1.5 lg:hidden">
            {list.map((r) => {
              const lc = levelColor(r.current_level);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                    style={{ background: lc.bg, color: lc.color }}
                  >
                    L{r.current_level}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {r.full_name}
                    </div>
                    <div
                      className="font-mono text-[10px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {r.cc_id} · {r.year_group ?? "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className="font-mono text-xs font-bold"
                      style={{ color: "var(--foreground)" }}
                    >
                      PB {fmtSecs(r.personal_best_seconds)}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {r.streak_count > 0 ? `🔥 ${r.streak_count}` : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs uppercase tracking-[0.06em]"
                    style={{
                      background: "var(--background-subtle)",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <th className="px-5 py-3 font-semibold">Runner</th>
                    <th className="px-5 py-3 font-semibold">CC ID</th>
                    <th className="px-5 py-3 font-semibold">Year</th>
                    <th className="px-5 py-3 font-semibold">Level</th>
                    <th className="px-5 py-3 font-semibold">PB</th>
                    <th className="px-5 py-3 font-semibold">Streak</th>
                    <th className="px-5 py-3 font-semibold">Points</th>
                    <th className="px-5 py-3 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const lc = levelColor(r.current_level);
                    const initial =
                      r.full_name.trim()[0]?.toUpperCase() ?? "?";
                    const pts = pointsByRunner.get(r.id) ?? 0;
                    return (
                      <tr
                        key={r.id}
                        className="tr-hover"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td className="px-5 py-3 font-semibold">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                              style={{
                                background: "var(--orange-light)",
                                color: "var(--orange)",
                              }}
                              aria-hidden
                            >
                              {initial}
                            </div>
                            <Link
                              href={`/dashboard/lead/runners/${r.id}`}
                              className="hover:text-[color:var(--orange)]"
                            >
                              {r.full_name}
                            </Link>
                          </div>
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {r.cc_id}
                        </td>
                        <td
                          className="px-5 py-3"
                          style={{ color: "var(--foreground-secondary)" }}
                        >
                          {r.year_group ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                            style={{ background: lc.bg, color: lc.color }}
                          >
                            L{r.current_level}
                          </span>
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--foreground-secondary)" }}
                        >
                          {fmtSecs(r.personal_best_seconds)}
                        </td>
                        <td
                          className="px-5 py-3"
                          style={{ color: "var(--foreground-secondary)" }}
                        >
                          {r.streak_count > 0 ? `🔥 ${r.streak_count}` : "—"}
                        </td>
                        <td
                          className="px-5 py-3 font-extrabold"
                          style={{ color: "var(--orange)" }}
                        >
                          {pts > 0 ? pts.toLocaleString() : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/dashboard/lead/runners/${r.id}`}
                            className="rounded-full border-2 px-3 py-1 text-xs font-bold"
                            style={{
                              borderColor: "var(--orange)",
                              color: "var(--orange)",
                            }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

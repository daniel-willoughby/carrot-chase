import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { levelColor, fmtSecs, posPoints } from "@/lib/theme/level";

type Runner = {
  id: string;
  cc_id: string;
  full_name: string;
  current_level: number;
  streak_count: number;
  personal_best_seconds: number | null;
  groups: string[];
  points: number;
};

export default async function LeadMembersPage() {
  const supabase = await createClient();

  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id");
  const groupIds = (leadGroups ?? []).map((g) => g.group_id);

  let runners: Runner[] = [];

  if (groupIds.length > 0) {
    const { data: rgRows } = await supabase
      .from("runner_groups")
      .select(
        "group_id, groups(name), runners!inner(id, cc_id, full_name, current_level, streak_count, personal_best_seconds, deleted_at)",
      )
      .in("group_id", groupIds);

    const map = new Map<string, Runner>();
    for (const row of rgRows ?? []) {
      const r = row.runners;
      if (!r || r.deleted_at) continue;
      const existing = map.get(r.id);
      if (existing) {
        if (row.groups?.name) existing.groups.push(row.groups.name);
      } else {
        map.set(r.id, {
          id: r.id,
          cc_id: r.cc_id,
          full_name: r.full_name,
          current_level: r.current_level,
          streak_count: r.streak_count,
          personal_best_seconds: r.personal_best_seconds,
          groups: row.groups?.name ? [row.groups.name] : [],
          points: 0,
        });
      }
    }

    // Points: sum of finish_position points from results
    const runnerIds = [...map.keys()];
    if (runnerIds.length) {
      const { data: results } = await supabase
        .from("results")
        .select("runner_id, finish_position")
        .in("runner_id", runnerIds);
      for (const r of results ?? []) {
        const cur = map.get(r.runner_id);
        if (cur && r.finish_position > 0) {
          cur.points += posPoints(r.finish_position - 1);
        }
      }
    }

    runners = [...map.values()].sort(
      (a, b) => a.current_level - b.current_level,
    );
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
            {runners.length} runners registered
          </p>
        </div>
      </header>

      {runners.length === 0 ? (
        <EmptyState
          icon="members"
          title="No runners in your groups"
          description="Your school admin can add runners and assign them to your groups."
        />
      ) : (
        <>
          {/* Mobile: card rows */}
          <div className="flex flex-col gap-1.5 lg:hidden">
            {runners.map((r) => {
              const lc = levelColor(r.current_level);
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/lead/runners/${r.id}`}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
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
                      {r.cc_id}
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
                      {r.streak_count > 0 ? `${r.streak_count}🔥` : "—"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: full table */}
          <Card className="hidden p-0 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <th className="px-5 py-3 font-semibold">Runner ID</th>
                    <th className="px-3 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Level</th>
                    <th className="px-3 py-3 font-semibold">PB</th>
                    <th className="px-3 py-3 font-semibold">Group</th>
                    <th className="px-3 py-3 font-semibold">Streak</th>
                    <th className="px-3 py-3 font-semibold">Points</th>
                    <th className="px-5 py-3 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {runners.map((r) => {
                    const lc = levelColor(r.current_level);
                    return (
                      <tr
                        key={r.id}
                        className="tr-hover"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {r.cc_id}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
                              style={{ background: lc.bg, color: lc.color }}
                            >
                              {r.full_name[0]}
                            </div>
                            <span className="font-semibold">
                              {r.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                            style={{ background: lc.bg, color: lc.color }}
                          >
                            L{r.current_level}
                          </span>
                        </td>
                        <td
                          className="px-3 py-3 font-mono text-xs font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {fmtSecs(r.personal_best_seconds)}
                        </td>
                        <td
                          className="px-3 py-3 text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {r.groups.length > 0 ? r.groups.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {r.streak_count > 0 ? (
                            <span
                              className="font-bold"
                              style={{ color: "var(--orange)" }}
                            >
                              {r.streak_count}🔥
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-bold">
                          {r.points.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/dashboard/lead/runners/${r.id}`}
                            className="text-xs font-semibold transition-colors"
                            style={{ color: "var(--orange)" }}
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

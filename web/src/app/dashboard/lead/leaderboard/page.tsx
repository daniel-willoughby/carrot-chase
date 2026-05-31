import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { levelColor, posPoints } from "@/lib/theme/level";
import { CURRENT_TERM } from "@/lib/term";

type Runner = {
  id: string;
  full_name: string;
  current_level: number;
  streak_count: number;
  groups: string[];
};

type Result = {
  finish_position: number;
  is_personal_best: boolean;
  medal: string | null;
  runner_id: string;
};

const RANK_BG = [
  "rgba(251,191,36,0.10)", // 1st: gold tint
  "var(--background-subtle)", // 2nd
  "rgba(255,107,43,0.08)", // 3rd: orange tint
];

export default async function LeadLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupFilter } = await searchParams;
  const supabase = await createClient();

  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id, groups(id, name)");
  const groupIds = (leadGroups ?? []).map((g) => g.group_id);
  const leadGroupOptions = (leadGroups ?? [])
    .map((g) => g.groups)
    .filter((g): g is { id: string; name: string } => !!g);

  if (groupIds.length === 0) {
    return (
      <div className="fade-in">
        <header className="mb-6">
          <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
            Leaderboard
          </h1>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--muted)" }}
          >
            {CURRENT_TERM} standings
          </p>
        </header>
        <Card>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No groups assigned yet.
          </p>
        </Card>
      </div>
    );
  }

  const queriedGroupIds =
    groupFilter && groupIds.includes(groupFilter) ? [groupFilter] : groupIds;

  const { data: rgRows } = await supabase
    .from("runner_groups")
    .select(
      "group_id, groups(name), runners!inner(id, full_name, current_level, streak_count, deleted_at)",
    )
    .in("group_id", queriedGroupIds);

  const runnerMap = new Map<string, Runner>();
  for (const row of rgRows ?? []) {
    const r = row.runners;
    if (!r || r.deleted_at) continue;
    const existing = runnerMap.get(r.id);
    if (existing) {
      if (row.groups?.name && !existing.groups.includes(row.groups.name)) {
        existing.groups.push(row.groups.name);
      }
    } else {
      runnerMap.set(r.id, {
        id: r.id,
        full_name: r.full_name,
        current_level: r.current_level,
        streak_count: r.streak_count,
        groups: row.groups?.name ? [row.groups.name] : [],
      });
    }
  }
  const runners = [...runnerMap.values()];

  // Pull all results for these runners this term
  const runnerIds = runners.map((r) => r.id);
  const { data: results } =
    runnerIds.length > 0
      ? await supabase
          .from("results")
          .select("runner_id, finish_position, is_personal_best, medal")
          .in("runner_id", runnerIds)
      : { data: [] as Result[] };

  // Aggregate per runner
  type Agg = {
    points: number;
    events: number;
    golds: number;
    silvers: number;
    bronzes: number;
    pbs: number;
  };
  const agg = new Map<string, Agg>();
  for (const id of runnerIds) {
    agg.set(id, { points: 0, events: 0, golds: 0, silvers: 0, bronzes: 0, pbs: 0 });
  }
  for (const r of (results as Result[]) ?? []) {
    const a = agg.get(r.runner_id);
    if (!a) continue;
    a.events += 1;
    if (r.finish_position > 0) a.points += posPoints(r.finish_position - 1);
    if (r.medal === "gold") a.golds += 1;
    if (r.medal === "silver") a.silvers += 1;
    if (r.medal === "bronze") a.bronzes += 1;
    if (r.is_personal_best) a.pbs += 1;
  }

  const standings = runners
    .map((r) => ({ ...r, ...(agg.get(r.id) ?? { points: 0, events: 0, golds: 0, silvers: 0, bronzes: 0, pbs: 0 }) }))
    .sort((a, b) => b.points - a.points || a.current_level - b.current_level);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="fade-in">
      <header className="mb-6 lg:mb-7">
        <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
          Leaderboard
        </h1>
        <p
          className="mt-0.5 text-xs lg:text-sm"
          style={{ color: "var(--muted)" }}
        >
          {CURRENT_TERM} standings
        </p>
      </header>

      {/* Podium */}
      {standings.length >= 3 && (
        <div className="mb-5 grid grid-cols-3 gap-2 lg:gap-4">
          {standings.slice(0, 3).map((r, i) => {
            const lc = levelColor(r.current_level);
            return (
              <Card key={r.id} className="text-center">
                <div className="mb-1.5 text-3xl lg:text-4xl">{medals[i]}</div>
                <Link
                  href={`/dashboard/runners/${r.id}`}
                  className="block truncate text-xs font-extrabold lg:text-base"
                >
                  {r.full_name}
                </Link>
                <div
                  className="mx-auto mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: lc.bg, color: lc.color }}
                >
                  L{r.current_level}
                </div>
                <div
                  className="mt-1.5 text-base font-extrabold lg:text-xl"
                  style={{ color: "var(--orange)" }}
                >
                  {r.points.toLocaleString()}
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "var(--muted)" }}
                >
                  pts
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full standings */}
      <Card className="p-0">
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="text-base font-bold tracking-tight">
            Full Standings
          </div>
          <form action="" method="get" className="flex items-center gap-2">
            <select
              name="group"
              defaultValue={groupFilter ?? ""}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              <option value="">All Groups</option>
              {leadGroupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              Apply
            </button>
          </form>
        </div>

        {/* Mobile: stacked rows */}
        <div className="lg:hidden">
          {standings.map((r, i) => {
            const lc = levelColor(r.current_level);
            return (
              <Link
                key={r.id}
                href={`/dashboard/runners/${r.id}`}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: i < 3 ? RANK_BG[i] : "transparent",
                }}
              >
                <div
                  className="w-7 shrink-0 text-center text-sm font-extrabold"
                  style={{
                    color:
                      i === 0
                        ? "var(--warning)"
                        : i === 2
                          ? "var(--orange)"
                          : "var(--muted)",
                  }}
                >
                  {i < 3 ? medals[i] : i + 1}
                </div>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                  style={{
                    background: "var(--orange-light)",
                    color: "var(--orange)",
                  }}
                >
                  {r.full_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {r.full_name}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {r.events} event{r.events === 1 ? "" : "s"} · {r.pbs} PB
                    {r.pbs === 1 ? "" : "s"}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: lc.bg, color: lc.color }}
                >
                  L{r.current_level}
                </span>
                <div className="shrink-0 text-right">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: "var(--orange)" }}
                  >
                    {r.points.toLocaleString()}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {r.streak_count}🔥
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Desktop: full table */}
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs font-semibold"
                style={{
                  borderBottom: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Runner</th>
                <th className="px-3 py-2.5">Level</th>
                <th className="px-3 py-2.5">Group</th>
                <th className="px-3 py-2.5">Points</th>
                <th className="px-3 py-2.5">Events</th>
                <th className="px-3 py-2.5">🥇</th>
                <th className="px-3 py-2.5">🥈</th>
                <th className="px-3 py-2.5">🥉</th>
                <th className="px-3 py-2.5">Streak</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((r, i) => {
                const lc = levelColor(r.current_level);
                return (
                  <tr
                    key={r.id}
                    className="tr-hover"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: i < 3 ? RANK_BG[i] : "transparent",
                    }}
                  >
                    <td className="px-3 py-3 text-base font-extrabold">
                      {i < 3 ? (
                        medals[i]
                      ) : (
                        <span
                          className="text-sm"
                          style={{ color: "var(--muted)" }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Link
                        href={`/dashboard/runners/${r.id}`}
                        className="hover:text-[color:var(--orange)]"
                      >
                        {r.full_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ background: lc.bg, color: lc.color }}
                      >
                        L{r.current_level}
                      </span>
                    </td>
                    <td
                      className="px-3 py-3 text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {r.groups.length > 0 ? r.groups.join(", ") : "—"}
                    </td>
                    <td
                      className="px-3 py-3 font-extrabold"
                      style={{ color: "var(--orange)" }}
                    >
                      {r.points.toLocaleString()}
                    </td>
                    <td
                      className="px-3 py-3"
                      style={{ color: "var(--muted)" }}
                    >
                      {r.events}
                    </td>
                    <td className="px-3 py-3">{r.golds}</td>
                    <td className="px-3 py-3">{r.silvers}</td>
                    <td className="px-3 py-3">{r.bronzes}</td>
                    <td
                      className="px-3 py-3 font-bold"
                      style={{ color: "var(--orange)" }}
                    >
                      {r.streak_count}🔥
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

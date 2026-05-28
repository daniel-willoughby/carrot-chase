import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { levelColor, posPoints } from "@/lib/theme/level";
import { CURRENT_TERM } from "@/lib/term";

const RANK_BG = [
  "rgba(251,191,36,0.10)",
  "var(--background-subtle)",
  "rgba(255,107,43,0.08)",
];

export default async function SchoolLeaderboardPage() {
  const supabase = await createClient();

  const { data: runners } = await supabase
    .from("runners")
    .select("id, full_name, current_level, streak_count")
    .is("deleted_at", null);

  const list = runners ?? [];
  const runnerIds = list.map((r) => r.id);

  const { data: results } =
    runnerIds.length > 0
      ? await supabase
          .from("results")
          .select("runner_id, finish_position, is_personal_best, medal")
          .in("runner_id", runnerIds)
      : { data: [] as { runner_id: string; finish_position: number; is_personal_best: boolean; medal: string | null }[] };

  type Agg = { points: number; events: number; golds: number; silvers: number; bronzes: number; pbs: number };
  const agg = new Map<string, Agg>();
  for (const id of runnerIds) agg.set(id, { points: 0, events: 0, golds: 0, silvers: 0, bronzes: 0, pbs: 0 });
  for (const r of results ?? []) {
    const a = agg.get(r.runner_id);
    if (!a) continue;
    a.events += 1;
    if (r.finish_position > 0) a.points += posPoints(r.finish_position - 1);
    if (r.medal === "gold") a.golds += 1;
    if (r.medal === "silver") a.silvers += 1;
    if (r.medal === "bronze") a.bronzes += 1;
    if (r.is_personal_best) a.pbs += 1;
  }

  const standings = list
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
          {CURRENT_TERM} · school-wide standings
        </p>
      </header>

      {standings.length >= 3 && (
        <div className="mb-5 grid grid-cols-3 gap-2 lg:gap-4">
          {standings.slice(0, 3).map((r, i) => {
            const lc = levelColor(r.current_level);
            return (
              <Card key={r.id} className="text-center">
                <div className="mb-1.5 text-3xl lg:text-4xl">{medals[i]}</div>
                <div className="truncate text-xs font-extrabold lg:text-base">
                  {r.full_name}
                </div>
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
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                  pts
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-0">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="text-base font-bold tracking-tight">
            Full Standings
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {standings.length} runner{standings.length === 1 ? "" : "s"}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="hidden lg:table-header-group">
            <tr
              className="text-left text-xs font-semibold"
              style={{
                borderBottom: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              <th className="px-5 py-2.5">#</th>
              <th className="px-3 py-2.5">Runner</th>
              <th className="px-3 py-2.5">Level</th>
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
                  <td className="px-5 py-3 text-base font-extrabold">
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
                  <td className="px-3 py-3 font-semibold">{r.full_name}</td>
                  <td className="px-3 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: lc.bg, color: lc.color }}
                    >
                      L{r.current_level}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 font-extrabold"
                    style={{ color: "var(--orange)" }}
                  >
                    {r.points.toLocaleString()}
                  </td>
                  <td className="px-3 py-3" style={{ color: "var(--muted)" }}>
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
      </Card>
    </div>
  );
}

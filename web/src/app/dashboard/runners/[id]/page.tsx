import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RemoveRunnerButton } from "./remove-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart } from "@/components/ui/line-chart";
import { NavIcon } from "@/components/ui/nav-icon";
import { fmtSecs, posPoints } from "@/lib/theme/level";
import { CURRENT_TERM, eventDate } from "@/lib/term";

function ordinal(n: number) {
  const v = n % 100;
  const s = ["th", "st", "nd", "rd"];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function RunnerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Pick the right "Back to Members" target based on the viewer's role —
  // this route is shared between school_admin, lead, and super_admin so
  // the back link must land them in the right list.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const backHref =
    viewerProfile?.role === "school_admin"
      ? "/dashboard/school/members"
      : viewerProfile?.role === "super_admin"
        ? "/dashboard/super"
        : "/dashboard/lead/members";

  const { data: runner } = await supabase
    .from("runners")
    .select("id, cc_id, full_name, current_level, streak_count, personal_best_seconds, year_group")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!runner) notFound();

  const { data: results } = await supabase
    .from("results")
    .select(
      "finish_position, raw_time_seconds, is_personal_best, level_after, finished_at, events(scheduled_at, groups(name), courses(name))",
    )
    .eq("runner_id", id)
    .order("finished_at", { ascending: false })
    .limit(10);

  const { data: groupRows } = await supabase
    .from("runner_groups")
    .select("groups(id, name)")
    .eq("runner_id", id);

  const groups = (groupRows ?? [])
    .map((g) => g.groups)
    .filter(Boolean) as { id: string; name: string }[];

  const recent = results ?? [];
  const totalPoints = recent.reduce(
    (sum, r) =>
      r.finish_position > 0 ? sum + posPoints(r.finish_position - 1) : sum,
    0,
  );
  const levelHistory = [...recent]
    .reverse()
    .map((r, i) => ({
      label: `E${i + 1}`,
      value: r.level_after ?? runner.current_level,
    }));
  // Pad to at least 2 points for the chart
  if (levelHistory.length === 1) {
    levelHistory.unshift({ label: "Start", value: levelHistory[0].value });
  }

  // Levels count DOWN as a runner improves; Level 0 is the elite top tier.
  const atTopTier = runner.current_level <= 0;
  const mod = runner.current_level % 10;
  const pct = atTopTier
    ? 100
    : mod === 0
      ? 0
      : Math.round(((10 - mod) / 10) * 100);
  // Clamp so a runner in the single-digit band never points at a negative
  // milestone (e.g. an L0 runner would otherwise read "Level -10").
  const nextMilestone = Math.max(
    0,
    mod === 0 ? runner.current_level - 10 : runner.current_level - mod,
  );

  const canRemove =
    viewerProfile?.role === "school_admin" ||
    viewerProfile?.role === "super_admin";

  return (
    <div className="fade-in">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-sm"
          style={{ color: "var(--muted)" }}
        >
          ← Back to Members
        </Link>
        {canRemove && (
          <RemoveRunnerButton runnerId={runner.id} runnerName={runner.full_name} />
        )}
      </div>

      {/* Hero */}
      <div
        className="relative mb-5 overflow-hidden rounded-2xl px-5 pb-4 pt-6 text-white"
        style={{
          background: "var(--orange-gradient)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-7 -top-7 h-32 w-32 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full text-3xl font-extrabold"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "3px solid rgba(255,255,255,0.35)",
            }}
          >
            {runner.full_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-0.5 text-xl font-extrabold leading-tight">
              {runner.full_name}
            </h1>
            <div
              className="mb-2 font-mono text-[11px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {runner.cc_id}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className="rounded-full border px-2.5 py-0.5 text-[13px] font-bold"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                Level {runner.current_level}
              </div>
              <div
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                🔥
                <span className="text-xs font-bold">
                  {runner.streak_count} streak
                </span>
              </div>
              <div
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                ⭐
                <span className="text-xs font-bold">
                  {totalPoints.toLocaleString()} pts
                </span>
              </div>
            </div>
          </div>
        </div>
        {groups.length > 0 && (
          <div
            className="relative mt-3.5 flex flex-wrap gap-1.5 pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
          >
            {groups.map((g) => (
              <div
                key={g.id}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                {g.name}
              </div>
            ))}
          </div>
        )}
        {/* Progress to next level milestone */}
        <div
          className="relative mt-3.5 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
        >
          <div className="mb-1.5 flex justify-between">
            <div
              className="text-[11px] font-semibold"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {atTopTier
                ? "Elite level reached 🏆"
                : `Progress to Level ${nextMilestone}`}
            </div>
            <div className="text-[11px] font-extrabold">{pct}%</div>
          </div>
          <div
            className="h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                background: "rgba(255,255,255,0.75)",
                width: `${pct}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Personal Best"
          value={fmtSecs(runner.personal_best_seconds)}
          sub="Fastest time"
          tone="blue"
          accented
          icon={<NavIcon name="clock" size={16} />}
        />
        <StatCard
          label="Events Run"
          value={recent.length}
          sub="Last 10"
          icon={<NavIcon name="events" size={16} />}
        />
        <StatCard
          label="Current Streak"
          value={runner.streak_count}
          sub="events"
          tone="orange"
          accented
          icon={<NavIcon name="flame" size={16} />}
        />
        <StatCard
          label="Total Points"
          value={totalPoints.toLocaleString()}
          sub={CURRENT_TERM}
          tone="purple"
          accented
          icon={<NavIcon name="star" size={16} />}
        />
      </div>

      {/* Level chart */}
      {levelHistory.length > 1 && (
        <Card className="mb-5">
          <div className="mb-3 text-base font-bold tracking-tight">
            Level Progression
          </div>
          <LineChart data={levelHistory} height={180} />
        </Card>
      )}

      {/* Recent events */}
      <Card>
        <div className="mb-3 text-base font-bold tracking-tight">
          Recent Events
        </div>
        {recent.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No events run yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  className="px-2 py-1.5 text-left text-[11px] font-semibold"
                  style={{ color: "var(--muted)" }}
                >
                  Date
                </th>
                <th
                  className="px-2 py-1.5 text-left text-[11px] font-semibold"
                  style={{ color: "var(--muted)" }}
                >
                  Pos
                </th>
                <th
                  className="px-2 py-1.5 text-left text-[11px] font-semibold"
                  style={{ color: "var(--muted)" }}
                >
                  Time
                </th>
                <th
                  className="px-2 py-1.5 text-right text-[11px] font-semibold"
                  style={{ color: "var(--muted)" }}
                >
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => {
                const pts =
                  r.finish_position > 0 ? posPoints(r.finish_position - 1) : 0;
                const pos =
                  r.finish_position === 0
                    ? "DNF"
                    : ordinal(r.finish_position);
                return (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      className="px-2 py-2 text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {eventDate(r.events?.scheduled_at ?? r.finished_at)}
                    </td>
                    <td className="px-2 py-2">
                      <Badge
                        tone={
                          r.finish_position === 1
                            ? "warning"
                            : r.finish_position <= 3
                              ? "orange"
                              : "neutral"
                        }
                      >
                        {pos}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 font-mono font-semibold">
                      {fmtSecs(r.raw_time_seconds)}
                      {r.is_personal_best && (
                        <span
                          className="ml-1.5 text-[10px] font-bold"
                          style={{ color: "var(--success)" }}
                        >
                          PB
                        </span>
                      )}
                    </td>
                    <td
                      className="px-2 py-2 text-right font-extrabold"
                      style={{ color: "var(--orange)" }}
                    >
                      {pts > 0 ? `+${pts}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

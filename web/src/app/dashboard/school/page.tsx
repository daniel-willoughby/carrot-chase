import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { NavIcon } from "@/components/ui/nav-icon";
import { OrgCrest } from "@/components/ui/org-crest";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { CURRENT_TERM, greeting, todayLong, eventDate } from "@/lib/term";
import { posPoints } from "@/lib/theme/level";

function firstName(full?: string | null, email?: string | null) {
  if (full) return full.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

export default async function SchoolAdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, organisation_id")
    .eq("id", user!.id)
    .single();

  const orgId = profile?.organisation_id;
  const { data: org } = orgId
    ? await supabase
        .from("organisations")
        .select("name")
        .eq("id", orgId)
        .single()
    : { data: null };
  void org;
  const startOfTerm = new Date();
  startOfTerm.setMonth(startOfTerm.getMonth() - 3);

  const [
    { count: members },
    { count: membersNewTerm },
    { count: groupsActive },
    { count: eventsTerm },
    { data: groupsList },
    { data: results },
  ] = await Promise.all([
    supabase.from("runners").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("runners")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", startOfTerm.toISOString()),
    supabase.from("groups").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("scheduled_at", startOfTerm.toISOString()),
    supabase
      .from("groups")
      .select("id, name")
      .is("deleted_at", null)
      .order("name")
      .limit(6),
    supabase
      .from("results")
      .select("runner_id, finish_position, runners!inner(id, full_name, current_level)"),
  ]);

  // Upcoming + recent events across the whole school
  const nowIso = new Date().toISOString();
  const [{ data: upcomingEvents }, { data: recentEvents }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
      )
      .is("deleted_at", null)
      .gte("scheduled_at", nowIso)
      .order("scheduled_at")
      .limit(4),
    supabase
      .from("events")
      .select(
        "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
      )
      .is("deleted_at", null)
      .lt("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: false })
      .limit(4),
  ]);

  // Per-group: count + 5 runners + last/next event
  const groupIds = (groupsList ?? []).map((g) => g.id);
  const [{ data: rgRows }, { data: groupEvents }] = await Promise.all([
    groupIds.length
      ? supabase
          .from("runner_groups")
          .select(
            "group_id, runners!inner(id, full_name, current_level, deleted_at)",
          )
          .in("group_id", groupIds)
      : { data: [] as never[] },
    groupIds.length
      ? supabase
          .from("events")
          .select("id, group_id, scheduled_at, status")
          .in("group_id", groupIds)
          .is("deleted_at", null)
      : { data: [] as never[] },
  ]);

  type RunnerLite = {
    id: string;
    full_name: string;
    current_level: number;
  };
  const byGroup = new Map<
    string,
    { runners: RunnerLite[]; lastEvent: string | null; nextEvent: string | null }
  >();
  for (const g of groupsList ?? []) {
    byGroup.set(g.id, { runners: [], lastEvent: null, nextEvent: null });
  }
  const nowMs = Date.now();
  for (const row of rgRows ?? []) {
    const r = row.runners;
    const bucket = byGroup.get(row.group_id);
    if (bucket && r && !r.deleted_at && bucket.runners.length < 5) {
      bucket.runners.push({
        id: r.id,
        full_name: r.full_name,
        current_level: r.current_level,
      });
    }
  }
  for (const e of groupEvents ?? []) {
    const bucket = byGroup.get(e.group_id);
    if (!bucket) continue;
    const ts = new Date(e.scheduled_at).getTime();
    if (ts < nowMs) {
      if (!bucket.lastEvent || new Date(bucket.lastEvent).getTime() < ts) {
        bucket.lastEvent = e.scheduled_at;
      }
    } else {
      if (!bucket.nextEvent || new Date(bucket.nextEvent).getTime() > ts) {
        bucket.nextEvent = e.scheduled_at;
      }
    }
  }

  // Series leader = highest points from results
  type LeaderAgg = { id: string; name: string; points: number };
  const leaderMap = new Map<string, LeaderAgg>();
  for (const r of results ?? []) {
    const runner = r.runners;
    if (!runner) continue;
    const cur = leaderMap.get(runner.id) ?? {
      id: runner.id,
      name: runner.full_name,
      points: 0,
    };
    if (r.finish_position > 0) cur.points += posPoints(r.finish_position - 1);
    leaderMap.set(runner.id, cur);
  }
  const seriesLeader = [...leaderMap.values()].sort(
    (a, b) => b.points - a.points,
  )[0];

  const totalMembers = members ?? 0;
  const newMembers = membersNewTerm ?? 0;

  return (
    <div className="fade-in">
      <header className="mb-6 flex items-start gap-4 lg:mb-7">
        {orgId && <OrgCrest orgKey={orgId} size={56} />}
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
            {greeting()}, {firstName(profile?.full_name, profile?.email)}.
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
            {todayLong()} · {CURRENT_TERM}
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mb-7 lg:grid-cols-4">
        <Link href="/dashboard/school/members">
          <StatCard
            label="Total Runners"
            value={totalMembers}
            trend={
              newMembers > 0
                ? { dir: "up", text: `+${newMembers} this term` }
                : { dir: "flat", text: "No new this term" }
            }
            tone="orange"
            accented
            icon={<NavIcon name="members" size={16} />}
            interactive
          />
        </Link>
        <Link href="/dashboard/school/groups">
          <StatCard
            label="Active Groups"
            value={groupsActive ?? 0}
            sub="All active"
            icon={<NavIcon name="groups" size={16} />}
            interactive
          />
        </Link>
        <Link href="/dashboard/school/events">
          <StatCard
            label="Events This Term"
            value={eventsTerm ?? 0}
            sub={`${eventsTerm ?? 0} scheduled`}
            icon={<NavIcon name="events" size={16} />}
            interactive
          />
        </Link>
        {seriesLeader ? (
          <Link href={`/dashboard/runners/${seriesLeader.id}`}>
            <StatCard
              label="Series Leader"
              value={
                seriesLeader.name.split(" ")[0] +
                " " +
                (seriesLeader.name.split(" ")[1]?.[0] ?? "")
              }
              sub={`${seriesLeader.points.toLocaleString()} pts`}
              tone="purple"
              accented
              icon={<NavIcon name="star" size={16} />}
              interactive
            />
          </Link>
        ) : (
          <StatCard
            label="Series Leader"
            value="—"
            sub="0 pts"
            tone="purple"
            accented
            icon={<NavIcon name="star" size={16} />}
          />
        )}
      </div>

      {/* Groups grid */}
      <section>
        <h2 className="mb-4 text-[20px] font-bold tracking-tight">Groups</h2>
        {(groupsList ?? []).length === 0 ? (
          <Card>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No groups yet.{" "}
              <Link
                href="/dashboard/school/groups"
                className="font-semibold"
                style={{ color: "var(--orange)" }}
              >
                Create the first →
              </Link>
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(groupsList ?? []).map((g) => {
              const bucket = byGroup.get(g.id);
              const runners = bucket?.runners ?? [];
              const count = runners.length;
              return (
                <Link
                  key={g.id}
                  href={`/dashboard/school/groups/${g.id}`}
                  className="block"
                >
                  <Card className="card-hover cursor-pointer">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="text-base font-extrabold tracking-tight">
                        {g.name}
                      </div>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          background: "var(--orange-light)",
                          color: "var(--orange)",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      className="mb-3 text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {count} runner{count === 1 ? "" : "s"}
                    </div>
                    {count > 0 && (
                      <div className="mb-4">
                        <AvatarStack runners={runners.map((r) => ({
                          id: r.id,
                          name: r.full_name,
                          level: r.current_level,
                        }))} max={5} />
                      </div>
                    )}
                    <div
                      className="flex items-end justify-between text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      <div>
                        <div>Last event</div>
                        <div
                          className="mt-0.5 text-sm font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {bucket?.lastEvent
                            ? eventDate(bucket.lastEvent)
                            : "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>Next event</div>
                        <div
                          className="mt-0.5 text-sm font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {bucket?.nextEvent
                            ? eventDate(bucket.nextEvent)
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming + Recent two-column */}
      <section className="mt-6 grid grid-cols-1 gap-3 lg:mt-7 lg:grid-cols-2 lg:gap-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-bold tracking-tight">
              Upcoming Events
            </div>
            <Link
              href="/dashboard/school/events"
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{ borderColor: "var(--orange)", color: "var(--orange)" }}
            >
              View all
            </Link>
          </div>
          {(upcomingEvents ?? []).length > 0 ? (
            (upcomingEvents ?? []).map((ev, i, arr) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 py-3"
                style={{
                  borderBottom:
                    i === arr.length - 1 ? "none" : "1px solid var(--border)",
                }}
              >
                <div className="min-w-0">
                  <div className="mb-0.5 truncate text-sm font-semibold">
                    {ev.groups?.name} · {ev.courses?.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {eventDate(ev.scheduled_at)}
                  </div>
                  <div className="mt-1.5">
                    <Badge tone="orange">{ev.format}</Badge>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm" style={{ color: "var(--muted)" }}>
              No upcoming events scheduled.
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-bold tracking-tight">
              Recent Results
            </div>
            <Link
              href="/dashboard/school/events"
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{ borderColor: "var(--orange)", color: "var(--orange)" }}
            >
              View all
            </Link>
          </div>
          {(recentEvents ?? []).length > 0 ? (
            (recentEvents ?? []).map((ev, i, arr) => (
              <div
                key={ev.id}
                className="py-3"
                style={{
                  borderBottom:
                    i === arr.length - 1 ? "none" : "1px solid var(--border)",
                }}
              >
                <div className="mb-0.5 truncate text-sm font-semibold">
                  {ev.groups?.name} · {ev.courses?.name}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {eventDate(ev.scheduled_at)}
                </div>
                <div className="mt-1.5">
                  <Badge tone="neutral">Done</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm" style={{ color: "var(--muted)" }}>
              No completed events yet.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}

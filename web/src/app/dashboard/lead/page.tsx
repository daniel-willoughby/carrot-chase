import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { NavIcon } from "@/components/ui/nav-icon";
import { CURRENT_TERM, greeting, todayLong, eventDate } from "@/lib/term";

function firstName(full?: string | null, email?: string | null) {
  if (full) return full.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

export default async function LeadDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user!.id)
    .single();

  // Groups the lead is assigned to
  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id, groups(name)");

  const groupIds = (leadGroups ?? []).map((g) => g.group_id);
  const groupName = leadGroups?.[0]?.groups?.name ?? "Your group";

  if (groupIds.length === 0) {
    return (
      <div className="fade-in">
        <header className="mb-7">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greeting()}, {firstName(profile?.full_name, profile?.email)}.
          </h1>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--muted)" }}
          >
            {todayLong()} · {CURRENT_TERM}
          </p>
        </header>
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🥕</div>
            <div className="text-lg font-bold tracking-tight">
              No groups assigned
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Ask your school admin to assign you to a group to get started.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Fetch group runners + events in parallel
  const nowIso = new Date().toISOString();
  const [{ data: rgRows }, { data: upcoming }, { data: recent }] =
    await Promise.all([
      supabase
        .from("runner_groups")
        .select(
          "runner_id, runners!inner(id, full_name, current_level, streak_count)",
        )
        .in("group_id", groupIds),
      supabase
        .from("events")
        .select(
          "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
        )
        .in("group_id", groupIds)
        .is("deleted_at", null)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at")
        .limit(5),
      supabase
        .from("events")
        .select(
          "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
        )
        .in("group_id", groupIds)
        .is("deleted_at", null)
        .lt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: false })
        .limit(5),
    ]);

  // De-dup runners (a runner could be in multiple of this lead's groups)
  const runnerMap = new Map<
    string,
    { id: string; full_name: string; current_level: number; streak_count: number }
  >();
  for (const row of rgRows ?? []) {
    const r = row.runners;
    if (r && !runnerMap.has(r.id)) runnerMap.set(r.id, r);
  }
  const runners = [...runnerMap.values()];

  const streakLeader = runners.reduce<typeof runners[number] | null>(
    (best, r) => (!best || r.streak_count > best.streak_count ? r : best),
    null,
  );
  const topLevel = runners.reduce<typeof runners[number] | null>(
    (best, r) => (!best || r.current_level < best.current_level ? r : best),
    null,
  );

  const nextEvent = upcoming?.[0];

  return (
    <div className="fade-in">
      <header className="mb-6 lg:mb-7">
        <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
          {greeting()}, {firstName(profile?.full_name, profile?.email)}.
        </h1>
        <p
          className="mt-0.5 text-xs lg:text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          {todayLong()} · {CURRENT_TERM}
        </p>
      </header>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-7 lg:grid-cols-4 lg:gap-4">
        <Link href="/dashboard/lead/members">
          <StatCard
            label="Runners"
            value={runners.length}
            sub={`In ${groupName}`}
            tone="orange"
            accented
            icon={<NavIcon name="members" size={16} />}
          />
        </Link>
        <Link href="/dashboard/lead/events">
          <StatCard
            label="Upcoming"
            value={upcoming?.length ?? 0}
            sub="Events scheduled"
            tone="blue"
            accented
            icon={<NavIcon name="events" size={16} />}
          />
        </Link>
        <StatCard
          label="Streak Leader"
          value={
            streakLeader ? streakLeader.full_name.split(" ")[0] : "—"
          }
          sub={`${streakLeader?.streak_count ?? 0} events in a row`}
          tone="success"
          accented
          icon={<NavIcon name="flame" size={16} />}
        />
        <StatCard
          label="Top Level"
          value={topLevel ? `L${topLevel.current_level}` : "—"}
          sub={topLevel ? topLevel.full_name.split(" ")[0] : ""}
          tone="purple"
          accented
          icon={<NavIcon name="star" size={16} />}
        />
      </div>

      {/* Hero: next event */}
      {nextEvent && (
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl p-6 text-white lg:mb-7"
          style={{
            background: "var(--orange-gradient)",
            boxShadow: "0 4px 20px rgba(232,82,10,0.28)",
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 text-[15px] font-bold lg:text-[18px]">
              Ready to run an event?
            </div>
            <div className="text-xs opacity-90 lg:text-sm">
              {nextEvent.groups?.name} · {nextEvent.courses?.name} ·{" "}
              {eventDate(nextEvent.scheduled_at)}
            </div>
          </div>
          <Link
            href={`/dashboard/lead/events/${nextEvent.id}/run`}
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold lg:px-7 lg:py-3 lg:text-base"
            style={{ background: "#fff", color: "var(--orange)" }}
          >
            Run event →
          </Link>
        </div>
      )}

      {/* Two-column: Upcoming + Recent */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
        <Card>
          <div className="mb-4 text-base font-bold tracking-tight">
            Upcoming Events
          </div>
          {upcoming && upcoming.length > 0 ? (
            upcoming.map((ev, i) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 py-3"
                style={{
                  borderBottom:
                    i === upcoming.length - 1
                      ? "none"
                      : "1px solid var(--border)",
                }}
              >
                <div className="min-w-0">
                  <div className="mb-0.5 text-sm font-semibold truncate">
                    {ev.groups?.name} · {ev.courses?.name}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {eventDate(ev.scheduled_at)}
                  </div>
                  <div className="mt-1.5">
                    <Badge tone="orange">{ev.format}</Badge>
                  </div>
                </div>
                <Link
                  href={`/dashboard/lead/events/${ev.id}/run`}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-white"
                  style={{ background: "var(--orange-gradient)" }}
                >
                  Run →
                </Link>
              </div>
            ))
          ) : (
            <p
              className="py-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              No upcoming events scheduled.
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-4 text-base font-bold tracking-tight">
            Recent Results
          </div>
          {recent && recent.length > 0 ? (
            recent.map((ev, i) => (
              <div
                key={ev.id}
                className="py-3"
                style={{
                  borderBottom:
                    i === recent.length - 1
                      ? "none"
                      : "1px solid var(--border)",
                }}
              >
                <div className="mb-0.5 text-sm font-semibold truncate">
                  {ev.groups?.name} · {ev.courses?.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {eventDate(ev.scheduled_at)}
                </div>
                <div className="mt-1.5">
                  <Badge tone="neutral">Completed</Badge>
                </div>
              </div>
            ))
          ) : (
            <p
              className="py-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              No completed events yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

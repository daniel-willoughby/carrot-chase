import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { NewGroupModal } from "./new-group-modal";
import { ArchiveButton } from "./archive-button";
import { InviteLeadModal } from "./invite-lead-modal";
import { eventDate } from "@/lib/term";

const TYPE_LABEL: Record<string, string> = {
  year: "Year",
  class: "Class",
  pe_class: "PE Class",
  breakfast_club: "Breakfast Club",
  club: "Running Club",
  custom: "Custom",
};

const INVITE_TONE: Record<string, "success" | "blue" | "warning" | "neutral"> =
  {
    accepted: "success",
    sent: "blue",
    expired: "warning",
    revoked: "neutral",
  };

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const supabase = await createClient();

  const baseQuery = supabase
    .from("groups")
    .select("id, name, group_type, created_at, deleted_at")
    .order("created_at", { ascending: false });

  const { data: groups } = showArchived
    ? await baseQuery.not("deleted_at", "is", null)
    : await baseQuery.is("deleted_at", null);

  const groupIds = (groups ?? []).map((g) => g.id);

  // Members for each group (up to 5 for the avatar stack)
  const { data: rgRows } = groupIds.length
    ? await supabase
        .from("runner_groups")
        .select(
          "group_id, runners!inner(id, full_name, current_level, deleted_at)",
        )
        .in("group_id", groupIds)
    : { data: [] as never[] };

  type RunnerLite = { id: string; full_name: string; current_level: number };
  const runnersByGroup = new Map<string, RunnerLite[]>();
  const countByGroup = new Map<string, number>();
  for (const id of groupIds) {
    runnersByGroup.set(id, []);
    countByGroup.set(id, 0);
  }
  for (const row of rgRows ?? []) {
    const r = row.runners;
    if (!r || r.deleted_at) continue;
    countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);
    const bucket = runnersByGroup.get(row.group_id);
    if (bucket && bucket.length < 5) {
      bucket.push({
        id: r.id,
        full_name: r.full_name,
        current_level: r.current_level,
      });
    }
  }

  // Last + next event per group
  const { data: groupEvents } = groupIds.length
    ? await supabase
        .from("events")
        .select("id, group_id, scheduled_at, status")
        .in("group_id", groupIds)
        .is("deleted_at", null)
    : { data: [] as never[] };

  const lastByGroup = new Map<string, string | null>();
  const nextByGroup = new Map<string, string | null>();
  const nowMs = Date.now();
  for (const e of groupEvents ?? []) {
    const ts = new Date(e.scheduled_at).getTime();
    if (ts < nowMs) {
      const cur = lastByGroup.get(e.group_id);
      if (!cur || new Date(cur).getTime() < ts) {
        lastByGroup.set(e.group_id, e.scheduled_at);
      }
    } else {
      const cur = nextByGroup.get(e.group_id);
      if (!cur || new Date(cur).getTime() > ts) {
        nextByGroup.set(e.group_id, e.scheduled_at);
      }
    }
  }

  // Active leads (accepted)
  const { data: activeLeads } = groupIds.length
    ? await supabase
        .from("group_leads")
        .select(
          "group_id, profiles!inner(id, full_name, email), groups!inner(name)",
        )
        .in("group_id", groupIds)
    : { data: [] as never[] };

  // Pending / expired invitations
  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, email, status, group_assignments, invited_role")
    .eq("invited_role", "lead")
    .in("status", ["sent", "expired"])
    .order("status");

  const groupNameById = new Map(
    (groups ?? []).map((g) => [g.id, g.name as string]),
  );

  type LeadRow = {
    id: string;
    name: string | null;
    email: string;
    groupLabels: string[];
    status: "accepted" | "sent" | "expired";
  };

  const leadRows: LeadRow[] = [];
  // Group accepted leads by profile id, collect their group names
  const acceptedMap = new Map<
    string,
    { id: string; name: string | null; email: string; groups: string[] }
  >();
  for (const row of activeLeads ?? []) {
    const p = row.profiles;
    if (!p) continue;
    const cur = acceptedMap.get(p.id) ?? {
      id: p.id,
      name: p.full_name,
      email: p.email,
      groups: [],
    };
    const name = row.groups?.name;
    if (name && !cur.groups.includes(name)) cur.groups.push(name);
    acceptedMap.set(p.id, cur);
  }
  for (const a of acceptedMap.values()) {
    leadRows.push({
      id: a.id,
      name: a.name,
      email: a.email,
      groupLabels: a.groups,
      status: "accepted",
    });
  }
  for (const inv of invitations ?? []) {
    const groupLabels = (inv.group_assignments ?? [])
      .map((id) => groupNameById.get(id))
      .filter((n): n is string => !!n);
    leadRows.push({
      id: inv.id,
      name: null,
      email: inv.email,
      groupLabels,
      status: inv.status as "sent" | "expired",
    });
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
            Manage your running groups
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={
              showArchived
                ? "/dashboard/school/groups"
                : "/dashboard/school/groups?archived=1"
            }
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground-secondary)",
            }}
          >
            {showArchived ? "← Active" : "Archived"}
          </Link>
          {!showArchived && (
            <InviteLeadModal groups={groups ?? []} />
          )}
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
          {/* Card grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {groups.map((g) => {
              const runners = runnersByGroup.get(g.id) ?? [];
              const count = countByGroup.get(g.id) ?? 0;
              const initial = g.name.trim()[0]?.toUpperCase() ?? "G";
              return (
                <Card key={g.id} className="flex flex-col">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold"
                      style={{
                        background: "var(--orange-light)",
                        color: "var(--orange)",
                      }}
                    >
                      {initial}
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{
                        background: "var(--orange-light)",
                        color: "var(--orange)",
                      }}
                    >
                      {count} runner{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mb-0.5 text-[15px] font-extrabold tracking-tight">
                    {g.name}
                  </div>
                  <div
                    className="mb-3 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {TYPE_LABEL[g.group_type] ?? g.group_type}
                  </div>
                  {runners.length > 0 && (
                    <div className="mb-4">
                      <AvatarStack
                        runners={runners.map((r) => ({
                          id: r.id,
                          name: r.full_name,
                          level: r.current_level,
                        }))}
                        max={5}
                      />
                    </div>
                  )}
                  <div
                    className="mb-3 flex items-end justify-between text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    <div>
                      <div>Last event</div>
                      <div
                        className="mt-0.5 text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {lastByGroup.get(g.id)
                          ? eventDate(lastByGroup.get(g.id)!)
                          : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>Next event</div>
                      <div
                        className="mt-0.5 text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {nextByGroup.get(g.id)
                          ? eventDate(nextByGroup.get(g.id)!)
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/dashboard/school/groups/${g.id}`}
                      className="rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
                      style={{
                        border: "1.5px solid var(--orange)",
                        color: "var(--orange)",
                      }}
                    >
                      View members
                    </Link>
                    <ArchiveButton
                      groupId={g.id}
                      archived={!!g.deleted_at}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Leads section */}
          {leadRows.length > 0 && (
            <section className="mt-6 lg:mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[18px] font-extrabold tracking-tight">
                  Leads
                </h2>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {
                    leadRows.filter((r) => r.status !== "accepted").length
                  }{" "}
                  pending
                </span>
              </div>
              <Card className="p-0">
                {leadRows.map((r, i) => {
                  const tone = INVITE_TONE[r.status] ?? "neutral";
                  const initial = (r.name ?? r.email)[0]?.toUpperCase() ?? "?";
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{
                        borderBottom:
                          i === leadRows.length - 1
                            ? "none"
                            : "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                        style={{
                          background: "var(--orange-light)",
                          color: "var(--orange)",
                        }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">
                          {r.name ?? (
                            <span
                              className="italic"
                              style={{ color: "var(--muted)" }}
                            >
                              Name not provided
                            </span>
                          )}
                        </div>
                        <div
                          className="truncate text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {r.email}
                          {r.groupLabels.length > 0 &&
                            ` · ${r.groupLabels.join(", ")}`}
                        </div>
                      </div>
                      <Badge tone={tone}>
                        {r.status === "accepted"
                          ? "Accepted"
                          : r.status === "sent"
                            ? "Sent"
                            : "Expired"}
                      </Badge>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

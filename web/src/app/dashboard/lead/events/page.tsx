import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { eventDate } from "@/lib/term";
import type { Database } from "@/lib/supabase/database.types";

type EventRow = {
  id: string;
  scheduled_at: string;
  format: Database["public"]["Enums"]["event_format"];
  status: Database["public"]["Enums"]["event_status"];
  groups: { name: string } | null;
  courses: { name: string; distance_metres: number } | null;
};

const STATUS_TONE: Record<
  Database["public"]["Enums"]["event_status"],
  "blue" | "orange" | "success" | "neutral"
> = {
  scheduled: "blue",
  in_progress: "orange",
  completed: "success",
  cancelled: "neutral",
};

const FORMAT_LABEL: Record<string, string> = {
  handicap: "Handicap",
  scratch: "Fun Run",
  relay: "Relay",
  pursuit: "Pursuit",
};

export default async function LeadEventsPage() {
  const supabase = await createClient();

  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id");

  const groupIds = (leadGroups ?? []).map((g) => g.group_id);

  const events: EventRow[] = groupIds.length
    ? (((
        await supabase
          .from("events")
          .select(
            "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
          )
          .in("group_id", groupIds)
          .is("deleted_at", null)
          .order("scheduled_at", { ascending: false })
      ).data as EventRow[] | null) ?? [])
    : [];

  // Per-event roster size
  const eventIdToCount = new Map<string, number>();
  if (events.length) {
    const eventGroupIds = [
      ...new Set(events.map((e) => e.groups).map(() => null).filter(Boolean)),
    ];
    void eventGroupIds; // not used; we recompute below
    // Fetch per-group runner counts to estimate event roster
    const allGroupIds = [
      ...new Set(
        events
          .map((e) => (e as unknown as { group_id?: string }).group_id)
          .filter(Boolean) as string[],
      ),
    ];
    if (allGroupIds.length) {
      const { data: rg } = await supabase
        .from("runner_groups")
        .select("group_id")
        .in("group_id", allGroupIds);
      const counts = new Map<string, number>();
      for (const r of rg ?? []) {
        counts.set(r.group_id, (counts.get(r.group_id) ?? 0) + 1);
      }
      for (const e of events) {
        const gId = (e as unknown as { group_id?: string }).group_id;
        if (gId) eventIdToCount.set(e.id, counts.get(gId) ?? 0);
      }
    }
  }

  return (
    <div className="fade-in">
      <header className="mb-6 flex flex-col items-start justify-between gap-3 lg:mb-7 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
            Events
          </h1>
          <p
            className="mt-1 text-[13px] sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            All scheduled and past events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/lead/events/new"
            className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors lg:px-4 lg:py-2 lg:text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground-secondary)",
            }}
          >
            + Create Event
          </Link>
        </div>
      </header>

      {events.length === 0 ? (
        <EmptyState
          icon="events"
          title="No events yet"
          description="Create your first event to get started."
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            {events.map((ev) => {
              const isUpcoming =
                ev.status === "scheduled" || ev.status === "in_progress";
              const accent =
                ev.status === "scheduled"
                  ? "var(--orange)"
                  : ev.status === "completed"
                    ? "var(--success)"
                    : "var(--muted)";
              return (
                <div
                  key={ev.id}
                  className="rounded-xl border p-3.5"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                    borderLeft: `3px solid ${accent}`,
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">
                        {ev.groups?.name} · {ev.courses?.name}
                      </div>
                      <div
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        {eventDate(ev.scheduled_at)} ·{" "}
                        {ev.courses?.distance_metres}m
                      </div>
                    </div>
                    {isUpcoming && (
                      <Link
                        href={`/dashboard/lead/events/${ev.id}/run`}
                        className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-white"
                        style={{ background: "var(--orange-gradient)" }}
                      >
                        Run →
                      </Link>
                    )}
                    {ev.status === "completed" && (
                      <Link
                        href={`/dashboard/lead/events/${ev.id}/results`}
                        className="shrink-0 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold"
                        style={{
                          borderColor: "var(--orange)",
                          color: "var(--orange)",
                        }}
                      >
                        Results →
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="orange">
                      {FORMAT_LABEL[ev.format] ?? ev.format}
                    </Badge>
                    <Badge tone={STATUS_TONE[ev.status]}>
                      {ev.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: prototype-style table */}
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
                    <th className="px-5 py-3 font-semibold">Event</th>
                    <th className="px-3 py-3 font-semibold">Group</th>
                    <th className="px-3 py-3 font-semibold">Date</th>
                    <th className="px-3 py-3 font-semibold">Format</th>
                    <th className="px-3 py-3 font-semibold">Runners</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => {
                    const isUpcoming =
                      ev.status === "scheduled" || ev.status === "in_progress";
                    return (
                      <tr
                        key={ev.id}
                        className="tr-hover"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td className="px-5 py-3 font-bold">
                          {ev.courses?.name ?? "Event"}
                        </td>
                        <td
                          className="px-3 py-3 text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {ev.groups?.name ?? "—"}
                        </td>
                        <td
                          className="px-3 py-3 text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {eventDate(ev.scheduled_at)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone="orange">
                            {FORMAT_LABEL[ev.format] ?? ev.format}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {eventIdToCount.get(ev.id) ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={STATUS_TONE[ev.status]}>
                            {ev.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {isUpcoming && (
                            <Link
                              href={`/dashboard/lead/events/${ev.id}/run`}
                              className="rounded-full px-3.5 py-1.5 text-xs font-bold text-white"
                              style={{ background: "var(--orange-gradient)" }}
                            >
                              Run →
                            </Link>
                          )}
                          {ev.status === "completed" && (
                            <Link
                              href={`/dashboard/lead/events/${ev.id}/results`}
                              className="text-xs font-semibold"
                              style={{ color: "var(--orange)" }}
                            >
                              Results →
                            </Link>
                          )}
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

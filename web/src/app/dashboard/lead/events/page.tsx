import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NavIcon } from "@/components/ui/nav-icon";
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

function EventRow({ ev }: { ev: EventRow }) {
  const isUpcoming = ev.status === "scheduled" || ev.status === "in_progress";
  const accent =
    ev.status === "scheduled"
      ? "var(--orange)"
      : ev.status === "completed"
        ? "var(--success)"
        : "var(--muted)";

  return (
    <div
      className="py-3.5"
      style={{
        borderBottom: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        paddingLeft: 12,
        marginLeft: -4,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-sm font-bold truncate">
            {ev.groups?.name} · {ev.courses?.name}
          </div>
          <div
            className="mb-1.5 text-xs"
            style={{ color: "var(--muted)" }}
          >
            {eventDate(ev.scheduled_at)} · {ev.courses?.distance_metres}m
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="orange">{FORMAT_LABEL[ev.format] ?? ev.format}</Badge>
            <Badge tone={STATUS_TONE[ev.status]}>{ev.status.replace("_", " ")}</Badge>
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
    </div>
  );
}

export default async function LeadEventsPage() {
  const supabase = await createClient();

  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id");

  const groupIds = (leadGroups ?? []).map((g) => g.group_id);

  const events: EventRow[] = groupIds.length
    ? ((
        await supabase
          .from("events")
          .select(
            "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
          )
          .in("group_id", groupIds)
          .is("deleted_at", null)
          .order("scheduled_at", { ascending: false })
      ).data as EventRow[] | null) ?? []
    : [];

  const upcoming = events.filter(
    (e) => e.status === "scheduled" || e.status === "in_progress",
  );
  const completed = events.filter((e) => e.status === "completed");

  return (
    <div className="fade-in">
      <header className="mb-6 flex items-center justify-between gap-3 lg:mb-7">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
            Events
          </h1>
          <p
            className="mt-0.5 text-xs lg:text-sm"
            style={{ color: "var(--muted)" }}
          >
            Scheduled and past events
          </p>
        </div>
        <Link
          href="/dashboard/lead/events/new"
          className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-white lg:px-5 lg:py-2.5"
          style={{
            background: "var(--orange-gradient)",
            boxShadow: "0 2px 8px rgba(232,82,10,0.28)",
          }}
        >
          + Create
        </Link>
      </header>

      <Card className="mb-4 lg:mb-6">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[15px] font-bold tracking-tight">Upcoming</div>
          <Badge tone="blue">{upcoming.length}</Badge>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon="events"
            title="No upcoming events"
            description="Create an event to get started."
          />
        ) : (
          upcoming.map((ev) => <EventRow key={ev.id} ev={ev} />)
        )}
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[15px] font-bold tracking-tight">
            Recent Results
          </div>
          <Badge tone="neutral">{completed.length}</Badge>
        </div>
        {completed.length === 0 ? (
          <EmptyState
            icon="runevent"
            title="No completed events yet"
            description="Results will appear here after your first race."
          />
        ) : (
          completed.map((ev) => <EventRow key={ev.id} ev={ev} />)
        )}
      </Card>
    </div>
  );
}

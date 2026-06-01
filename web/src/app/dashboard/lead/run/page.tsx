import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { eventDateTime } from "@/lib/term";
import type { Database } from "@/lib/supabase/database.types";

type EventRow = {
  id: string;
  scheduled_at: string;
  format: Database["public"]["Enums"]["event_format"];
  status: Database["public"]["Enums"]["event_status"];
  groups: { name: string } | null;
  courses: { name: string; distance_metres: number } | null;
};

const FORMAT_LABEL: Record<string, string> = {
  handicap: "Handicap",
  scratch: "Fun Run",
  relay: "Relay",
  pursuit: "Pursuit",
};

export default async function RunEventPicker() {
  const supabase = await createClient();

  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id");
  const groupIds = (leadGroups ?? []).map((g) => g.group_id);

  const nowIso = new Date().toISOString();

  const events: EventRow[] = groupIds.length
    ? (((
        await supabase
          .from("events")
          .select(
            "id, scheduled_at, format, status, groups(name), courses(name, distance_metres)",
          )
          .in("group_id", groupIds)
          .is("deleted_at", null)
          .eq("status", "scheduled")
          .gte("scheduled_at", nowIso)
          .order("scheduled_at")
      ).data as EventRow[] | null) ?? [])
    : [];

  return (
    <div className="fade-in">
      <header className="mb-6 lg:mb-7">
        <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
          Run Event
        </h1>
        <p
          className="mt-1 text-[13px] sm:text-sm"
          style={{ color: "var(--muted)" }}
        >
          Pick the event you&apos;re about to run. The next event below is the
          one most likely to launch now.
        </p>
      </header>

      {events.length === 0 ? (
        <EmptyState
          icon="runevent"
          title="No upcoming events"
          description="Create an event from Events first, then come back here."
          action={
            <Link
              href="/dashboard/lead/events/new"
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--orange-gradient)" }}
            >
              + Create event
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {events.map((ev, i) => (
            <Card
              key={ev.id}
              className={i === 0 ? "card-hover" : "card-hover"}
              style={
                i === 0
                  ? {
                      background: "var(--orange-gradient)",
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 4px 20px rgba(232,82,10,0.28)",
                    }
                  : undefined
              }
            >
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[15px] font-bold lg:text-[18px] ${
                      i === 0 ? "" : ""
                    }`}
                  >
                    {ev.groups?.name} · {ev.courses?.name}
                  </div>
                  <div
                    className="mt-1 text-xs lg:text-sm"
                    style={{
                      color: i === 0 ? "rgba(255,255,255,0.9)" : "var(--muted)",
                    }}
                  >
                    {eventDateTime(ev.scheduled_at)} ·{" "}
                    {ev.courses?.distance_metres}m
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {i === 0 ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          background: "rgba(255,255,255,0.18)",
                          color: "#fff",
                        }}
                      >
                        {FORMAT_LABEL[ev.format] ?? ev.format}
                      </span>
                    ) : (
                      <Badge tone="orange">
                        {FORMAT_LABEL[ev.format] ?? ev.format}
                      </Badge>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/lead/events/${ev.id}/run`}
                  className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold lg:px-7 lg:py-3 lg:text-base"
                  style={
                    i === 0
                      ? { background: "#fff", color: "var(--orange)" }
                      : {
                          background: "var(--orange-gradient)",
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(232,82,10,0.28)",
                        }
                  }
                >
                  Run →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

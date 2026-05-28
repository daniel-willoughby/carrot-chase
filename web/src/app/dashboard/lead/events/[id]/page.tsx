import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

const FORMAT_LABEL: Record<string, string> = {
  handicap: "Handicap",
  scratch: "Fun Run",
  relay: "Relay",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "*, groups(name), courses(name, distance_metres, marshal_points)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Group members for the attendance count preview.
  const { count: members } = await supabase
    .from("runner_groups")
    .select("*", { count: "exact", head: true })
    .eq("group_id", event.group_id);

  return (
    <div className="fade-in">
      <div className="mb-2 text-sm text-[color:var(--muted)]">
        <Link
          href="/dashboard/lead/events"
          className="hover:text-[color:var(--orange)]"
        >
          ← All events
        </Link>
      </div>

      <PageHeader
        title={`${event.groups?.name ?? "Event"} · ${event.courses?.name ?? ""}`}
        description={
          <>
            {new Date(event.scheduled_at).toLocaleString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {FORMAT_LABEL[event.format] ?? event.format}
          </>
        }
        actions={<Badge tone="blue">{event.status}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Distance"
          value={`${event.courses?.distance_metres ?? 0} m`}
          tone="orange"
        />
        <StatCard label="Roster" value={members ?? 0} sub="runners in group" tone="blue" />
        <StatCard
          label="Marshals"
          value={event.marshals_required ?? 0}
          sub="auto-calculated"
          tone="success"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold tracking-tight">Run this event</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Live attendance, staggered starts, tap-to-record finish, name
            matching, and result commitment all live in E6.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {event.status === "completed" ? (
              <Link
                href={`/dashboard/lead/events/${event.id}/results`}
                className="rounded-full px-5 py-2.5 text-center text-sm font-bold text-white"
                style={{ background: "var(--orange-gradient)" }}
              >
                View results →
              </Link>
            ) : (
              <Link
                href={`/dashboard/lead/events/${event.id}/run`}
                className="rounded-full px-5 py-2.5 text-center text-sm font-bold text-white"
                style={{ background: "var(--orange-gradient)" }}
              >
                Run event →
              </Link>
            )}
            <p className="text-xs text-[color:var(--muted)]">
              Live attendance, countdown, tap-to-finish and name-matching all
              happen in this flow.
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold tracking-tight">Notes</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-[color:var(--foreground-secondary)]">
            {event.notes || "No marshal notes for this event."}
          </p>

          {event.term && (
            <p className="mt-4 text-xs uppercase tracking-[0.06em] text-[color:var(--muted)]">
              Series: <span className="font-semibold">{event.term}</span>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

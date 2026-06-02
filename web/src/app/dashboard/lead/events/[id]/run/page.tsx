import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RunEventClient } from "./run-event-client";

// Headroom for this page's Server Actions on cold serverless invocations
// (an insert plus page revalidation can exceed the default function timeout).
export const maxDuration = 60;

export default async function RunEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, format, scheduled_at, status, group_id, groups(name), courses(name, distance_metres)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  if (event.status === "completed") {
    redirect(`/dashboard/lead/events/${id}/results`);
  }

  const { data: rgRows } = await supabase
    .from("runner_groups")
    .select(
      "runners!inner(id, full_name, current_level, streak_count, personal_best_seconds)",
    )
    .eq("group_id", event.group_id);

  const runners = (rgRows ?? [])
    .map((r) => r.runners)
    .filter(Boolean)
    .map((r) => ({
      id: r.id,
      name: r.full_name,
      level: r.current_level,
      pb: r.personal_best_seconds,
      streak: r.streak_count,
    }));

  return (
    <div className="fade-in" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-[520px] px-4 py-6 lg:py-8">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href={`/dashboard/lead/events`}
            className="text-xl"
            style={{ color: "var(--muted)" }}
            aria-label="Back to events"
          >
            ←
          </Link>
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold tracking-tight">
              {event.groups?.name} · {event.courses?.name}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--muted)" }}
            >
              {event.format} · {event.courses?.distance_metres}m
            </div>
          </div>
        </div>

        <RunEventClient
          eventId={event.id}
          groupId={event.group_id}
          format={event.format}
          runners={runners}
        />
      </div>
    </div>
  );
}

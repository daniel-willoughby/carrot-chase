import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { eventDate } from "@/lib/term";
import type { Database } from "@/lib/supabase/database.types";

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

export default async function SchoolEventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, scheduled_at, format, status, marshals_required, groups(name), courses(name, distance_metres)",
    )
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false });

  const list = events ?? [];

  return (
    <div className="fade-in">
      <header className="mb-6 lg:mb-7">
        <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
          Events
        </h1>
        <p
          className="mt-0.5 text-xs lg:text-sm"
          style={{ color: "var(--muted)" }}
        >
          All sessions across your groups · {list.length} total
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon="events"
          title="No events yet"
          description="Group Leads create events from their dashboard."
        />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs uppercase tracking-[0.06em]"
                  style={{
                    background: "var(--background-subtle)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  <th className="px-5 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold">Group</th>
                  <th className="px-5 py-3 font-semibold">Course</th>
                  <th className="px-5 py-3 font-semibold">Format</th>
                  <th className="px-5 py-3 font-semibold">Marshals</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr
                    key={e.id}
                    className="tr-hover"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold">
                        {eventDate(e.scheduled_at)}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        {new Date(e.scheduled_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3">{e.groups?.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      {e.courses?.name ?? "—"}
                      <span
                        className="ml-1 text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        ({e.courses?.distance_metres ?? 0} m)
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="orange">
                        {FORMAT_LABEL[e.format] ?? e.format}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {e.marshals_required ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[e.status]}>
                        {e.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

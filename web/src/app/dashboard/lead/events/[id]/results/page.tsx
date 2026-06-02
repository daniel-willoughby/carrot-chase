import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { levelColor, fmtSecs } from "@/lib/theme/level";
import { eventDateTime } from "@/lib/term";
import { Confetti } from "@/components/ui/confetti";
import { ResultFanfare } from "./result-fanfare";

const MEDAL_EMOJI: Record<string, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, format, scheduled_at, status, groups(name), courses(name, distance_metres)",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: results } = await supabase
    .from("results")
    .select(
      "finish_position, raw_time_seconds, adjusted_time_seconds, is_personal_best, is_most_improved, level_before, level_after, level_change, medal, runners!inner(id, full_name, current_level)",
    )
    .eq("event_id", id)
    .order("finish_position");

  const finished = (results ?? []).filter((r) => r.finish_position > 0);
  const dnfList = (results ?? []).filter((r) => r.finish_position === 0);

  return (
    <div className="fade-in" style={{ background: "var(--background)" }}>
      <Confetti />
      <ResultFanfare />
      <div className="mx-auto max-w-[640px] px-4 py-8">
        <div className="mb-2 text-sm">
          <Link
            href={`/dashboard/lead/events`}
            style={{ color: "var(--muted)" }}
          >
            ← All events
          </Link>
        </div>

        <header className="mb-7 text-center">
          <div
            className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--orange)" }}
          >
            Race complete
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight lg:text-[28px]">
            {event.groups?.name} · {event.courses?.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {eventDateTime(event.scheduled_at)}
          </p>
        </header>

        {/* Podium */}
        {finished.length >= 3 && (
          <div className="mb-6 grid grid-cols-3 items-end gap-2 lg:gap-3">
            {[finished[1], finished[0], finished[2]].map((r, idx) => {
              const realPos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const lc = levelColor(r.runners.current_level);
              const heights = [120, 160, 100];
              return (
                <div key={r.runners.id} className="text-center">
                  <div className="mb-1 text-3xl">
                    {MEDAL_EMOJI[r.medal ?? ""] || "🏃"}
                  </div>
                  <div
                    className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: lc.bg, color: lc.color }}
                  >
                    L{r.runners.current_level}
                  </div>
                  <div
                    className="flex flex-col justify-end rounded-t-xl px-2 py-3"
                    style={{
                      height: heights[idx],
                      background:
                        idx === 1
                          ? "var(--orange-gradient)"
                          : "var(--background-subtle)",
                      color: idx === 1 ? "#fff" : "var(--foreground)",
                    }}
                  >
                    <div className="text-[10px] font-bold opacity-80">
                      {realPos === 1 ? "1st" : realPos === 2 ? "2nd" : "3rd"}
                    </div>
                    <div className="truncate text-xs font-bold">
                      {r.runners.full_name.split(" ")[0]}
                    </div>
                    <div className="font-mono text-[11px]">
                      {fmtSecs(r.raw_time_seconds)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <Card>
          <div className="mb-4 text-base font-bold">Full results</div>
          {finished.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No results recorded.
            </p>
          ) : (
            <div className="space-y-1">
              {finished.map((r) => {
                const lc = levelColor(r.runners.current_level);
                const lvlChange = r.level_change ?? 0;
                return (
                  <div
                    key={r.runners.id}
                    className="flex items-center gap-3 py-2"
                    style={{
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="w-7 text-center text-sm font-extrabold"
                      style={{ color: "var(--orange)" }}
                    >
                      {r.finish_position}
                    </div>
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ background: lc.bg, color: lc.color }}
                    >
                      L{r.runners.current_level}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {r.runners.full_name}
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-[11px]"
                        style={{ color: "var(--muted)" }}
                      >
                        <span className="font-mono">
                          {fmtSecs(r.raw_time_seconds)}
                        </span>
                        {r.is_personal_best && (
                          <Badge tone="success">PB</Badge>
                        )}
                        {r.is_most_improved && (
                          <Badge tone="purple">Most improved</Badge>
                        )}
                        {lvlChange !== 0 && (
                          <span
                            className="font-bold"
                            style={{
                              color:
                                lvlChange < 0
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            {lvlChange < 0 ? "▼" : "▲"} {Math.abs(lvlChange)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {dnfList.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div
                className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ color: "var(--muted)" }}
              >
                Did not finish
              </div>
              {dnfList.map((r) => (
                <div key={r.runners.id} className="py-1.5 text-sm">
                  {r.runners.full_name}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard/lead"
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--orange-gradient)" }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

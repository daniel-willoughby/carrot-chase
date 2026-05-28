import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { levelColor, fmtSecs } from "@/lib/theme/level";

type Runner = {
  id: string;
  cc_id: string;
  full_name: string;
  current_level: number;
  streak_count: number;
  personal_best_seconds: number | null;
};

export default async function LeadMembersPage() {
  const supabase = await createClient();

  const { data: leadGroups } = await supabase
    .from("group_leads")
    .select("group_id");
  const groupIds = (leadGroups ?? []).map((g) => g.group_id);

  let runners: Runner[] = [];
  if (groupIds.length > 0) {
    const { data: rgRows } = await supabase
      .from("runner_groups")
      .select(
        "runners!inner(id, cc_id, full_name, current_level, streak_count, personal_best_seconds, deleted_at)",
      )
      .in("group_id", groupIds);

    const map = new Map<string, Runner>();
    for (const row of rgRows ?? []) {
      const r = row.runners;
      if (r && !r.deleted_at && !map.has(r.id)) {
        map.set(r.id, {
          id: r.id,
          cc_id: r.cc_id,
          full_name: r.full_name,
          current_level: r.current_level,
          streak_count: r.streak_count,
          personal_best_seconds: r.personal_best_seconds,
        });
      }
    }
    runners = [...map.values()].sort((a, b) => a.current_level - b.current_level);
  }

  return (
    <div className="fade-in">
      <header className="mb-6 lg:mb-7">
        <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
          Members
        </h1>
        <p
          className="mt-0.5 text-xs lg:text-sm"
          style={{ color: "var(--muted)" }}
        >
          Runners in your groups · {runners.length} total
        </p>
      </header>

      {runners.length === 0 ? (
        <EmptyState
          icon="members"
          title="No runners yet"
          description="Your school admin can add runners and assign them to your groups."
        />
      ) : (
        <Card className="p-0">
          <ul>
            {runners.map((r, i) => {
              const lc = levelColor(r.current_level);
              return (
                <li
                  key={r.id}
                  style={{
                    borderBottom:
                      i === runners.length - 1
                        ? "none"
                        : "1px solid var(--border)",
                  }}
                >
                  <Link
                    href={`/dashboard/lead/runners/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--background-subtle)] lg:px-5 lg:py-3.5"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                      style={{ background: lc.bg, color: lc.color }}
                    >
                      L{r.current_level}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">
                        {r.full_name}
                      </div>
                      <div
                        className="font-mono text-[11px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {r.cc_id}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div
                        className="font-mono font-bold"
                        style={{ color: "var(--foreground)" }}
                      >
                        PB {fmtSecs(r.personal_best_seconds)}
                      </div>
                      <div style={{ color: "var(--muted)" }}>
                        {r.streak_count}🔥
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

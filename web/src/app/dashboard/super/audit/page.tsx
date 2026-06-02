import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 50;

/**
 * Super Admin audit-log read view.
 *
 * Surfaces the append-only public.audit_log table (migration 0004). RLS
 * already restricts SELECT to super_admins, so a school_admin hitting this
 * URL directly would see an empty table — we also redirect non-super-admins
 * for a cleaner experience.
 */

type Tone = "neutral" | "success" | "warning" | "danger" | "blue" | "purple";

// Human labels + a tone per action. Destructive actions lean warning/danger.
const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  "auth.login": { label: "Signed in", tone: "neutral" },
  "auth.logout": { label: "Signed out", tone: "neutral" },
  "organisation.create": { label: "Created organisation", tone: "success" },
  "organisation.update": { label: "Edited organisation", tone: "blue" },
  "organisation.status_change": { label: "Changed org status", tone: "warning" },
  "runner.create": { label: "Added runner", tone: "success" },
  "runner.import": { label: "Imported runners", tone: "blue" },
  "runner.remove": { label: "Removed runner", tone: "danger" },
  "runner.erase": { label: "Erased runner (GDPR)", tone: "danger" },
  "group.create": { label: "Created group", tone: "success" },
  "group.archive": { label: "Archived group", tone: "warning" },
  "group.restore": { label: "Restored group", tone: "blue" },
  "group.lead_assign": { label: "Assigned lead", tone: "blue" },
  "group.lead_unassign": { label: "Unassigned lead", tone: "warning" },
  "group.member_add": { label: "Added group member", tone: "success" },
  "group.member_remove": { label: "Removed group member", tone: "warning" },
  "invitation.create": { label: "Invited lead", tone: "blue" },
  "event.cancel": { label: "Cancelled event", tone: "danger" },
  "event.commit_results": { label: "Committed results", tone: "success" },
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  lead: "Group Lead",
};

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function summariseMetadata(meta: unknown): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (v === null || v === undefined || v === "") continue;
    parts.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  }
  return parts.join(" · ");
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const supabase = await createClient();

  // Defensive role gate — RLS already enforces this at the data layer.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  const sp = await searchParams;
  const rawQuery = (sp.q ?? "").trim().slice(0, 100);
  // Strip characters that would break PostgREST's or-filter grammar.
  const q = rawQuery.replace(/[,()*%:]/g, " ").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_log")
    .select(
      "id, actor_id, actor_role, action, target_table, target_id, metadata, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (q) {
    // Match the human action labels too, so "removed runner" finds
    // "runner.remove", not just the raw action string.
    const ql = q.toLowerCase();
    const matchedActions = Object.entries(ACTION_META)
      .filter(([, m]) => m.label.toLowerCase().includes(ql))
      .map(([k]) => k);

    // Resolve actors whose name/email matches, then match their events.
    const { data: matchedActors } = await supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.*${q}*,email.ilike.*${q}*`);
    const actorIdMatches = (matchedActors ?? []).map((a) => a.id);

    const orParts = [
      `action.ilike.*${q}*`,
      `target_table.ilike.*${q}*`,
      // Common metadata keys people search by (names, emails, org names).
      `metadata->>full_name.ilike.*${q}*`,
      `metadata->>name.ilike.*${q}*`,
      `metadata->>email.ilike.*${q}*`,
      `metadata->>organisation.ilike.*${q}*`,
    ];
    if (matchedActions.length) orParts.push(`action.in.(${matchedActions.join(",")})`);
    if (actorIdMatches.length) orParts.push(`actor_id.in.(${actorIdMatches.join(",")})`);

    query = query.or(orParts.join(","));
  }

  const { data: rows, count } = await query.range(from, to);

  const events = rows ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : from + 1;
  const lastShown = Math.min(from + PAGE_SIZE, total);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", rawQuery);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/dashboard/super/audit${qs ? `?${qs}` : ""}`;
  };

  // Resolve actor display names (audit_log.actor_id → auth.users, which has
  // no PostgREST FK to profiles, so we look them up separately).
  const actorIds = [
    ...new Set(events.map((e) => e.actor_id).filter((id): id is string => !!id)),
  ];
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };

  const actorById = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name || a.email]),
  );

  return (
    <div className="fade-in">
      <PageHeader
        title="Audit Log"
        description="Append-only record of sensitive actions across all organisations."
      />

      {/* Search */}
      <form action="/dashboard/super/audit" className="mb-3 flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={rawQuery}
          placeholder="Search actions, people, organisations…"
          className="flex-1 rounded-full px-4 py-2 text-sm"
          style={{
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </form>

      <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
        {total === 0
          ? "No matching events"
          : `Showing ${firstShown}–${lastShown} of ${total} event${total === 1 ? "" : "s"}`}
        {q && (
          <>
            {" · "}
            <Link href="/dashboard/super/audit" className="font-semibold underline">
              Clear search
            </Link>
          </>
        )}
      </p>

      {events.length === 0 ? (
        <EmptyState
          icon="clock"
          title={q ? "No matching events" : "No audit events yet"}
          description={
            q
              ? "Try a different search term — names, organisations, or action types all work."
              : "Sensitive actions — organisation changes, runner removals, result commits — will appear here as they happen."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--background-subtle)] text-left text-[11px] uppercase tracking-[0.06em] text-[color:var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-6 py-3 text-right font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const meta = ACTION_META[e.action] ?? {
                    label: e.action,
                    tone: "neutral" as Tone,
                  };
                  const actorName = e.actor_id
                    ? actorById.get(e.actor_id) ?? "Unknown user"
                    : "System";
                  const roleLabel = e.actor_role
                    ? ROLE_LABEL[e.actor_role] ?? e.actor_role
                    : null;
                  const details = summariseMetadata(e.metadata);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--background-subtle)]/40"
                    >
                      <td className="px-6 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[color:var(--foreground)]">
                          {actorName}
                        </div>
                        {roleLabel && (
                          <div className="text-xs text-[color:var(--muted)]">
                            {roleLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">
                        <span className="line-clamp-2 break-words">
                          {details || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className="whitespace-nowrap text-[color:var(--foreground-secondary)]"
                          title={new Date(e.created_at).toLocaleString("en-GB")}
                        >
                          {relativeTime(e.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ border: "1px solid var(--border)", color: "var(--foreground-secondary)" }}
            >
              ← Newer
            </Link>
          ) : (
            <span className="text-sm" style={{ color: "var(--muted)", opacity: 0.5 }}>
              ← Newer
            </span>
          )}

          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ border: "1px solid var(--border)", color: "var(--foreground-secondary)" }}
            >
              Older →
            </Link>
          ) : (
            <span className="text-sm" style={{ color: "var(--muted)", opacity: 0.5 }}>
              Older →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

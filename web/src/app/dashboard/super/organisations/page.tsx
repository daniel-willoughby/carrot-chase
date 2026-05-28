import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NewOrganisationModal } from "./new-organisation-modal";
import { StatusToggle } from "./status-toggle";
import type { Database } from "@/lib/supabase/database.types";

type OrgStatus = Database["public"]["Enums"]["org_status"];

const STATUS_TONE: Record<OrgStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  suspended: "warning",
  archived: "neutral",
};

const TYPE_LABEL: Record<string, string> = {
  school: "Primary School",
  club: "Running Club",
  business: "Business",
  distributor: "Distributor",
  mat: "Multi-Academy Trust",
};

export default async function OrganisationsPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, name, org_type, status, location, created_at")
    .order("created_at", { ascending: false });

  const { count: pendingInvites } = await supabase
    .from("invitations")
    .select("*", { count: "exact", head: true })
    .eq("invited_role", "school_admin")
    .eq("status", "sent");

  // For each org, fetch counts (small N so simple loop is fine at MVP scale).
  const orgIds = (orgs ?? []).map((o) => o.id);
  const [{ data: runnersCounts }, { data: eventCounts }] = await Promise.all([
    orgIds.length
      ? supabase
          .from("runners")
          .select("organisation_id")
          .in("organisation_id", orgIds)
          .is("deleted_at", null)
      : { data: [] },
    orgIds.length
      ? supabase
          .from("events")
          .select("group_id, groups!inner(organisation_id)")
          .in("groups.organisation_id", orgIds)
          .is("deleted_at", null)
      : { data: [] },
  ]);

  const runnerCount = new Map<string, number>();
  for (const r of runnersCounts ?? []) {
    runnerCount.set(r.organisation_id, (runnerCount.get(r.organisation_id) ?? 0) + 1);
  }
  const eventCount = new Map<string, number>();
  for (const e of eventCounts ?? []) {
    const orgId = e.groups?.organisation_id;
    if (orgId) eventCount.set(orgId, (eventCount.get(orgId) ?? 0) + 1);
  }

  return (
    <div className="fade-in">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold leading-none tracking-tight text-[color:var(--foreground)]">
            Organisations
          </h1>
          <p className="mt-1.5 text-[15px] text-[color:var(--muted)]">
            Every school, club, and partner using Carrot Chase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" disabled>
            ✉ Invite Admin
          </Button>
          <NewOrganisationModal />
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-4 flex border-b border-[color:var(--border)]">
        <button
          type="button"
          className="border-b-2 border-[color:var(--orange)] px-4 py-2.5 text-sm font-bold text-[color:var(--orange)]"
        >
          Organisations ({orgs?.length ?? 0})
        </button>
        <button
          type="button"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground-secondary)]"
        >
          Invitations ({pendingInvites ?? 0} pending)
        </button>
      </div>

      {!orgs || orgs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl">🥕</div>
          <h3 className="mt-3 text-lg font-bold">No organisations yet</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Create your first organisation to start onboarding schools and clubs.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--background-subtle)] text-left text-[11px] uppercase tracking-[0.06em] text-[color:var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Runners</th>
                  <th className="px-4 py-3 font-semibold">Events</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--background-subtle)]/40"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--background-subtle)] text-base">
                          🏫
                        </div>
                        <Link
                          href={`/dashboard/super/organisations/${o.id}`}
                          className="font-bold text-[color:var(--foreground)] hover:text-[color:var(--orange)]"
                        >
                          {o.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--foreground-secondary)]">
                      {TYPE_LABEL[o.org_type] ?? o.org_type}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {o.location || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums">
                      {runnerCount.get(o.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums">
                      {eventCount.get(o.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <StatusToggle orgId={o.id} status={o.status} />
                        <Link
                          href={`/dashboard/super/organisations/${o.id}`}
                          className="text-sm font-semibold text-[color:var(--orange)] hover:underline"
                        >
                          View →
                        </Link>
                      </div>
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

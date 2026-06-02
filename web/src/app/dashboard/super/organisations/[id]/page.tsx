import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { OrgCrest } from "@/components/ui/org-crest";
import { StatusToggle } from "../status-toggle";
import { EditOrganisationModal } from "../edit-organisation-modal";
import { InviteAdminButton } from "../invite-admin-button";
import type { Database } from "@/lib/supabase/database.types";

type OrgStatus = Database["public"]["Enums"]["org_status"];

const STATUS_TONE: Record<OrgStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  suspended: "warning",
  archived: "neutral",
};

const TYPE_LABEL: Record<string, string> = {
  school: "School",
  club: "Running Club",
  business: "Business",
  distributor: "Distributor",
  mat: "Multi-Academy Trust",
};

const GROUP_TYPE_LABEL: Record<string, string> = {
  year: "Year",
  class: "Class",
  pe_class: "PE Class",
  breakfast_club: "Breakfast Club",
  club: "Running Club",
  custom: "Custom",
};

const MEMBER_PREVIEW = 12;

// Headroom for this page's Server Actions on cold serverless invocations
// (an insert plus page revalidation can exceed the default function timeout).
export const maxDuration = 60;

export default async function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", id)
    .single();

  if (!org) notFound();

  const [
    { count: members },
    { count: events },
    { data: groupList },
    { data: memberList },
  ] = await Promise.all([
    supabase
      .from("runners")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", id)
      .is("deleted_at", null),
    supabase
      .from("events")
      .select("*, groups!inner(organisation_id)", { count: "exact", head: true })
      .eq("groups.organisation_id", id)
      .is("deleted_at", null),
    supabase
      .from("groups")
      .select("id, name, group_type")
      .eq("organisation_id", id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("runners")
      .select("id, full_name, cc_id, current_level")
      .eq("organisation_id", id)
      .is("deleted_at", null)
      .order("full_name")
      .limit(MEMBER_PREVIEW),
  ]);

  const groups = groupList?.length ?? 0;

  return (
    <div className="fade-in">
      <div className="mb-2 text-sm text-[color:var(--muted)]">
        <Link
          href="/dashboard/super/organisations"
          className="hover:text-[color:var(--orange)]"
        >
          ← All organisations
        </Link>
      </div>

      <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between lg:mb-7">
        <div className="flex items-center gap-4">
          <OrgCrest orgKey={org.id} size={64} />
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
              {org.name}
            </h1>
            <p className="mt-1 text-[13px] text-[color:var(--muted)] sm:text-sm">
              {TYPE_LABEL[org.org_type] ?? org.org_type}
              {org.location && ` · ${org.location}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[org.status]}>{org.status}</Badge>
          <InviteAdminButton orgId={org.id} orgName={org.name} />
          <EditOrganisationModal
            org={{
              id: org.id,
              name: org.name,
              org_type: org.org_type,
              location: org.location,
            }}
          />
          <StatusToggle orgId={org.id} status={org.status} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Groups" value={groups ?? 0} tone="orange" />
        <StatCard label="Members" value={members ?? 0} tone="blue" />
        <StatCard label="Events" value={events ?? 0} tone="success" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Groups drill-down */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-3.5">
            <h3 className="text-lg font-bold tracking-tight">Groups</h3>
            <span className="text-xs text-[color:var(--muted)]">{groups}</span>
          </div>
          {groupList && groupList.length > 0 ? (
            <ul>
              {groupList.map((g, i) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                  style={{
                    borderBottom:
                      i === groupList.length - 1
                        ? "none"
                        : "1px solid var(--border)",
                  }}
                >
                  <span className="font-semibold">{g.name}</span>
                  <Badge tone="neutral">
                    {GROUP_TYPE_LABEL[g.group_type] ?? g.group_type}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-[color:var(--muted)]">
              No groups yet.
            </p>
          )}
        </Card>

        {/* Members drill-down */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-3.5">
            <h3 className="text-lg font-bold tracking-tight">Members</h3>
            <span className="text-xs text-[color:var(--muted)]">{members ?? 0}</span>
          </div>
          {memberList && memberList.length > 0 ? (
            <>
              <ul>
                {memberList.map((m, i) => (
                  <li
                    key={m.id}
                    style={{
                      borderBottom:
                        i === memberList.length - 1
                          ? "none"
                          : "1px solid var(--border)",
                    }}
                  >
                    <Link
                      href={`/dashboard/runners/${m.id}`}
                      className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-[color:var(--background-subtle)]"
                    >
                      <span>
                        <span className="font-semibold">{m.full_name}</span>{" "}
                        <span className="font-mono text-xs text-[color:var(--muted)]">
                          {m.cc_id}
                        </span>
                      </span>
                      <Badge tone="orange">L{m.current_level}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
              {(members ?? 0) > MEMBER_PREVIEW && (
                <p className="px-5 py-3 text-center text-xs text-[color:var(--muted)]">
                  + {(members ?? 0) - MEMBER_PREVIEW} more
                </p>
              )}
            </>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-[color:var(--muted)]">
              No members yet.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <h3 className="text-lg font-bold tracking-tight">Metadata</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[color:var(--muted)]">Created</dt>
              <dd>
                {new Date(org.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--muted)]">Stripe customer</dt>
              <dd className="font-mono text-xs">
                {org.stripe_customer_id ?? "Not set (Phase 2)"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--muted)]">MAT parent</dt>
              <dd>{org.mat_parent_id ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

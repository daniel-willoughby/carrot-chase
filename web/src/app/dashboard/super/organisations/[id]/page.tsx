import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { OrgCrest } from "@/components/ui/org-crest";
import { StatusToggle } from "../status-toggle";
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

  const [{ count: groups }, { count: members }, { count: events }] = await Promise.all([
    supabase
      .from("groups")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", id)
      .is("deleted_at", null),
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
  ]);

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
          <StatusToggle orgId={org.id} status={org.status} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Groups" value={groups ?? 0} tone="orange" />
        <StatCard label="Members" value={members ?? 0} tone="blue" />
        <StatCard label="Events" value={events ?? 0} tone="success" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold tracking-tight">Drill-down (coming next)</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Per US-06, clicking View on an org will switch the Super Admin into
            that org&apos;s scoped dashboard. Builds on top of E3 (groups) and E4
            (members).
          </p>
        </Card>

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

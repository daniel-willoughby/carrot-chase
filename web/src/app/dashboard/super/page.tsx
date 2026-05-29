import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LineChart } from "@/components/ui/line-chart";
import { StatCard } from "@/components/ui/stat-card";
import { NavIcon } from "@/components/ui/nav-icon";
import { OrgCrest } from "@/components/ui/org-crest";
import type { Database } from "@/lib/supabase/database.types";

const TYPE_LABEL: Record<string, string> = {
  school: "Primary School",
  business: "Business",
  club: "Running Club",
  distributor: "Distributor",
  mat: "MAT",
};

type OrgStatus = Database["public"]["Enums"]["org_status"];
const STATUS_TONE: Record<OrgStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  suspended: "warning",
  archived: "neutral",
};

function firstName(full?: string | null, email?: string | null) {
  if (full) return full.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

function monthLabels() {
  const out: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: d.toLocaleString("en-GB", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return out;
}

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user!.id)
    .single();

  // Top-level counts
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: orgs },
    { count: orgsNew },
    { count: runners },
    { count: runnersNew },
    { count: eventsAll },
    { data: runnersTimeline },
    { data: recentOrgs },
  ] = await Promise.all([
    supabase.from("organisations").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("organisations").select("*", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", startOfMonth.toISOString()),
    supabase.from("runners").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("runners").select("*", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", startOfMonth.toISOString()),
    supabase.from("events").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("runners").select("created_at").is("deleted_at", null).order("created_at"),
    supabase
      .from("organisations")
      .select("id, name, org_type, location, status, logo_url, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Build the 12-month runner growth series (cumulative).
  const months = monthLabels();
  const series = months.map(({ label, year, month }) => {
    const cutoff = new Date(year, month + 1, 1);
    const count = (runnersTimeline ?? []).filter(
      (r) => new Date(r.created_at) < cutoff,
    ).length;
    return { label, value: count };
  });

  return (
    <div className="fade-in">
      <header className="mb-7">
        <h1 className="text-[22px] font-extrabold tracking-tight text-[color:var(--foreground)] sm:text-[26px]">
          Dashboard
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--muted)] sm:text-sm">
          Welcome back, {firstName(profile?.full_name, profile?.email)}. Here&apos;s
          what&apos;s happening.
        </p>
      </header>

      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <Link href="/dashboard/super/organisations" className="block">
          <StatCard
            label="Total Organisations"
            value={orgs ?? 0}
            trend={
              (orgsNew ?? 0) > 0
                ? { dir: "up", text: `+${orgsNew} this month` }
                : { dir: "flat", text: "No new this month" }
            }
            icon={<NavIcon name="orgs" size={16} />}
            interactive
          />
        </Link>
        <Link href="/dashboard/super/organisations" className="block">
          <StatCard
            label="Total Runners"
            value={(runners ?? 0).toLocaleString("en-GB")}
            trend={
              (runnersNew ?? 0) > 0
                ? { dir: "up", text: `+${runnersNew} this month` }
                : { dir: "flat", text: "No new this month" }
            }
            tone="orange"
            accented
            icon={<NavIcon name="members" size={16} />}
            interactive
          />
        </Link>
        <Link href="/dashboard/super/organisations" className="block">
          <StatCard
            label="Total Events"
            value={eventsAll ?? 0}
            sub="All time"
            icon={<NavIcon name="events" size={16} />}
            interactive
          />
        </Link>
        <Link href="/dashboard/super/billing" className="block">
          <StatCard
            label="Monthly Revenue"
            value="£0"
            sub="MVP — manual invoicing"
            tone="success"
            accented
            icon={<NavIcon name="pound" size={16} />}
            interactive
          />
        </Link>
      </div>

      {/* Runner growth chart */}
      <section className="mt-6">
        <Card>
          <h3 className="text-lg font-bold tracking-tight">
            Runner Growth (Last 12 Months)
          </h3>
          <div className="mt-3">
            <LineChart data={series} />
          </div>
        </Card>
      </section>

      {/* Recent Organisations */}
      <section className="mt-6">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
            <h3 className="text-lg font-bold tracking-tight">
              Recent Organisations
            </h3>
            <Link
              href="/dashboard/super/organisations"
              className="rounded-full border-2 border-[color:var(--orange)] bg-transparent px-3.5 py-1.5 text-xs font-bold text-[color:var(--orange)] transition-colors hover:bg-[color:var(--orange-light)]"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--background-subtle)] text-left text-[11px] uppercase tracking-[0.06em] text-[color:var(--muted)]">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {(!recentOrgs || recentOrgs.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-[color:var(--muted)]"
                    >
                      No organisations yet.{" "}
                      <Link
                        href="/dashboard/super/organisations"
                        className="font-semibold text-[color:var(--orange)] hover:underline"
                      >
                        Create the first →
                      </Link>
                    </td>
                  </tr>
                )}
                {(recentOrgs ?? []).map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--background-subtle)]/40"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <OrgCrest orgKey={o.id} size={32} />
                        <span className="font-bold text-[color:var(--foreground)]">
                          {o.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--foreground-secondary)]">
                      {TYPE_LABEL[o.org_type] ?? o.org_type}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted)]">
                      {o.location || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/super/organisations/${o.id}`}
                        className="text-sm font-semibold text-[color:var(--orange)] hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

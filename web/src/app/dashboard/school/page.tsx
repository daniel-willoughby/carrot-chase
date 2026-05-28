import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { LineChart } from "@/components/ui/line-chart";
import { StatCard } from "@/components/ui/stat-card";
import { NavIcon } from "@/components/ui/nav-icon";

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

export default async function SchoolAdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, organisation_id, organisations(name)")
    .eq("id", user!.id)
    .single();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: members },
    { count: membersNew },
    { count: groups },
    { count: events },
    { data: runnersTimeline },
  ] = await Promise.all([
    supabase.from("runners").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("runners").select("*", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", startOfMonth.toISOString()),
    supabase.from("groups").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("events").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("runners").select("created_at").is("deleted_at", null).order("created_at"),
  ]);

  const months = monthLabels();
  const series = months.map(({ label, year, month }) => {
    const cutoff = new Date(year, month + 1, 1);
    const count = (runnersTimeline ?? []).filter((r) => new Date(r.created_at) < cutoff).length;
    return { label, value: count };
  });

  return (
    <div className="fade-in">
      <header className="mb-7">
        <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
          {profile?.organisations?.name ?? "Dashboard"}
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--muted)] sm:text-sm">
          Welcome back, {firstName(profile?.full_name, profile?.email)}. Here&apos;s
          how your school is doing.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <Link href="/dashboard/school/members" className="block">
          <StatCard
            label="Members"
            value={members ?? 0}
            trend={
              (membersNew ?? 0) > 0
                ? { dir: "up", text: `+${membersNew} this month` }
                : { dir: "flat", text: "No new this month" }
            }
            tone="orange"
            accented
            icon={<NavIcon name="members" size={16} />}
            onClick={() => {}}
          />
        </Link>
        <Link href="/dashboard/school/groups" className="block">
          <StatCard
            label="Active groups"
            value={groups ?? 0}
            sub="Currently running"
            icon={<NavIcon name="groups" size={16} />}
            onClick={() => {}}
          />
        </Link>
        <Link href="/dashboard/school/events" className="block">
          <StatCard
            label="Events this term"
            value={events ?? 0}
            sub="All time"
            icon={<NavIcon name="events" size={16} />}
            onClick={() => {}}
          />
        </Link>
        <StatCard
          label="Annual ROI"
          value="—"
          sub="Phase 2 billing"
          tone="success"
          accented
          icon={<NavIcon name="pound" size={16} />}
        />
      </div>

      <section className="mt-6">
        <Card>
          <h3 className="text-lg font-bold tracking-tight">Member Growth (Last 12 Months)</h3>
          <div className="mt-3">
            <LineChart data={series} />
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold tracking-tight">Quick actions</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Get the term moving.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/school/groups"
              className="rounded-full bg-orange-gradient px-4 py-2 text-sm font-bold text-white shadow-[0_2px_8px_rgba(232,82,10,0.28)] hover:opacity-90"
            >
              + Create group
            </Link>
            <Link
              href="/dashboard/school/members"
              className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--foreground-secondary)] hover:bg-[color:var(--background-subtle)]"
            >
              Import members
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold tracking-tight">Coming next</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-[color:var(--foreground-secondary)]">
            <li>• Invite Leads via email (E1)</li>
            <li>• Top runners and streak leaders</li>
            <li>• Recent events &amp; results</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}

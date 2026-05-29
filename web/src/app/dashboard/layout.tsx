import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  MobileBottomNav,
  MobileTopBar,
  Sidebar,
  type NavItem,
  type Role,
} from "@/components/layout/sidebar";
import { OfflineReplayer } from "@/components/offline-replayer";

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  lead: "Group Lead",
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  super_admin: [
    { href: "/dashboard/super", label: "Dashboard", icon: "dashboard" },
    {
      href: "/dashboard/super/organisations",
      label: "Organisations",
      icon: "orgs",
    },
    { href: "/dashboard/super/billing", label: "Billing", icon: "billing" },
  ],
  school_admin: [
    { href: "/dashboard/school", label: "Dashboard", icon: "dashboard" },
    { href: "/dashboard/school/groups", label: "Groups", icon: "groups" },
    { href: "/dashboard/school/members", label: "Members", icon: "members" },
    { href: "/dashboard/school/courses", label: "Courses", icon: "runevent" },
    { href: "/dashboard/school/events", label: "Events", icon: "events" },
    {
      href: "/dashboard/school/leaderboard",
      label: "Leaderboard",
      icon: "leaderboard",
    },
  ],
  lead: [
    { href: "/dashboard/lead", label: "Dashboard", icon: "dashboard" },
    { href: "/dashboard/lead/members", label: "Members", icon: "members" },
    { href: "/dashboard/lead/events", label: "Events", icon: "events" },
    {
      href: "/dashboard/lead/leaderboard",
      label: "Leaderboard",
      icon: "leaderboard",
    },
    {
      href: "/dashboard/lead/run",
      label: "Run Event",
      icon: "runevent",
    },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "lead") as Role;
  const roleLabel = ROLE_LABEL[role] ?? role;
  const userName = profile?.full_name || (user.email ?? "User");
  const userInitial = (userName.trim()[0] ?? "?").toUpperCase();
  const navItems = NAV_BY_ROLE[role] ?? [];

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--background)" }}
    >
      <Sidebar
        role={role}
        roleLabel={roleLabel}
        userName={userName}
        userInitial={userInitial}
        navItems={navItems}
      />
      <MobileTopBar />
      <main
        className="min-w-0 flex-1 lg:ml-[240px]"
        style={{
          padding: "32px",
          paddingTop: "calc(56px + 16px)",
          paddingBottom: "calc(60px + 16px)",
        }}
      >
        <div className="mx-auto max-w-[1200px] lg:pt-0 lg:pb-0">{children}</div>
      </main>
      <MobileBottomNav navItems={navItems} />
      <OfflineReplayer />
    </div>
  );
}

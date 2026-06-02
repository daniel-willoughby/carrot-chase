"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { NavIcon, type IconName } from "@/components/ui/nav-icon";
import { useTheme } from "@/lib/theme/theme-provider";
import { ResetDemoButton } from "./reset-demo-button";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export type Role = "super_admin" | "school_admin" | "lead";

type Props = {
  role: Role;
  roleLabel: string;
  userName: string;
  userInitial: string;
  /** Used to conditionally show "Reset demo data" for @demo.carrotchase.com users. */
  userEmail?: string;
  navItems: NavItem[];
};

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  // /dashboard/lead is active only on exact match; deeper hrefs match prefix
  const isRoot = /^\/dashboard\/(super|school|lead)$/.test(href);
  if (isRoot) return false;
  return pathname.startsWith(href);
}

export function Sidebar({ role, roleLabel, userName, userInitial, userEmail, navItems }: Props) {
  const isDemoUser = !!userEmail && userEmail.endsWith("@demo.carrotchase.com");
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();

  const pillBg =
    role === "super_admin"
      ? "var(--purple-light)"
      : role === "school_admin"
        ? "var(--blue-light)"
        : "var(--orange-light)";
  const pillColor =
    role === "super_admin"
      ? "var(--purple)"
      : role === "school_admin"
        ? "var(--blue)"
        : "var(--orange)";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-[100] hidden w-[240px] overflow-hidden border-r lg:grid"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="text-[28px]" aria-hidden>🥕</span>
          <div className="leading-tight">
            <div
              className="text-[16px] font-extrabold tracking-tight"
              style={{ color: "var(--orange)" }}
            >
              Carrot Chase
            </div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              {roleLabel}
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-sm transition-colors"
              style={{
                background: active ? "var(--orange-gradient)" : "transparent",
                color: active ? "#fff" : "var(--foreground-secondary)",
                fontWeight: active ? 600 : 500,
                boxShadow: active ? "0 2px 8px rgba(232,82,10,0.22)" : "none",
              }}
            >
              <NavIcon name={item.icon} size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User chip + actions */}
      <div
        className="px-4 pt-3 pb-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="mb-2.5 overflow-hidden rounded-xl px-3 py-2.5"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex w-full items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
              style={{
                background: "var(--orange-gradient)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {userInitial}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                className="truncate text-[13px] font-bold"
                title={userName}
                style={{ minWidth: 0, maxWidth: "100%" }}
              >
                {userName}
              </div>
              <span
                className="mt-0.5 inline-block rounded-full px-2 py-px text-[10px] font-bold"
                style={{ background: pillBg, color: pillColor }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={toggle}
          className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-medium transition-colors"
          style={{
            border: "1px solid var(--border)",
            color: "var(--muted)",
            background: "transparent",
          }}
        >
          <NavIcon name={isDark ? "sun" : "moon"} size={14} />
          {isDark ? "Light mode" : "Dark mode"}
        </button>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-full py-2 text-[13px] font-medium transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--muted)",
              background: "transparent",
            }}
          >
            Sign out
          </button>
        </form>

        {isDemoUser && (
          <div className="mt-2 text-center">
            <ResetDemoButton />
          </div>
        )}
      </div>
    </aside>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard/super": "Dashboard",
  "/dashboard/super/organisations": "Organisations",
  "/dashboard/super/billing": "Billing",
  "/dashboard/super/audit": "Audit Log",
  "/dashboard/school": "Dashboard",
  "/dashboard/school/groups": "Groups",
  "/dashboard/school/members": "Members",
  "/dashboard/school/events": "Events",
  "/dashboard/lead": "Dashboard",
  "/dashboard/lead/groups": "Groups",
  "/dashboard/lead/members": "Members",
  "/dashboard/lead/events": "Events",
  "/dashboard/lead/leaderboard": "Leaderboard",
  "/dashboard/lead/events/new": "Create Event",
};

function pageTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/events/") && pathname.endsWith("/run")) return "Run Event";
  if (pathname.includes("/events/") && pathname.endsWith("/results")) return "Results";
  if (pathname.includes("/runners/")) return "Runner";
  if (pathname.includes("/events/")) return "Event";
  return "Carrot Chase";
}

export function MobileTopBar() {
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();
  const title = pageTitle(pathname);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[200] flex h-14 items-center justify-between px-4 lg:hidden"
      style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex w-10 items-center">
        <span className="text-2xl" aria-hidden>🥕</span>
      </div>
      <div className="flex-1 text-center text-[15px] font-bold">{title}</div>
      <div className="flex w-16 items-center justify-end gap-1">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex items-center p-1.5"
          style={{ color: "var(--muted)" }}
        >
          <NavIcon name={isDark ? "sun" : "moon"} size={18} />
        </button>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex items-center p-1.5"
            style={{ color: "var(--muted)" }}
          >
            <NavIcon name="logout" size={18} />
          </button>
        </form>
      </div>
    </header>
  );
}

export function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] flex h-[60px] items-stretch lg:hidden"
      style={{
        background: "var(--card)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
            style={{ color: active ? "var(--orange)" : "var(--muted)" }}
          >
            {active && (
              <div
                className="absolute"
                style={{
                  top: 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 44,
                  height: 30,
                  borderRadius: 999,
                  background: "var(--orange-light)",
                  zIndex: 0,
                }}
              />
            )}
            <NavIcon
              name={item.icon}
              size={18}
              style={{ position: "relative", zIndex: 1 }}
            />
            <span
              className="relative z-[1] text-[10px]"
              style={{ fontWeight: active ? 700 : 500 }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

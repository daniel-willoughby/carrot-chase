/**
 * Level palette helper (ported from prototype `levelColor`).
 * Uses CSS variables so light/dark switch automatically.
 */
export function levelColor(level: number) {
  if (level <= 20)
    return {
      bg: "var(--level-elite-bg)",
      color: "var(--level-elite-fg)",
      border: "var(--level-elite-border)",
    };
  if (level <= 45)
    return {
      bg: "var(--level-good-bg)",
      color: "var(--level-good-fg)",
      border: "var(--level-good-border)",
    };
  if (level <= 70)
    return {
      bg: "var(--level-dev-bg)",
      color: "var(--level-dev-fg)",
      border: "var(--level-dev-border)",
    };
  return {
    bg: "var(--level-base-bg)",
    color: "var(--level-base-fg)",
    border: "var(--level-base-border)",
  };
}

export type StatusKey = "active" | "trial" | "inactive" | "upcoming" | "completed";

export function statusBadge(status: StatusKey | string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: "var(--success-light)", color: "var(--success)", label: "Active" },
    trial: { bg: "var(--warning-light)", color: "var(--warning)", label: "Trial" },
    inactive: { bg: "var(--danger-light)", color: "var(--danger)", label: "Inactive" },
    upcoming: { bg: "var(--blue-light)", color: "var(--blue)", label: "Upcoming" },
    completed: {
      bg: "var(--background-subtle)",
      color: "var(--muted)",
      label: "Completed",
    },
  };
  return map[status] || map.active;
}

export function fmtSecs(s: number | null | undefined) {
  if (s === null || s === undefined) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const POS_POINTS = [200, 170, 145, 125, 110, 95, 85, 75, 65, 55];
export function posPoints(i: number) {
  return POS_POINTS[i] ?? 45;
}

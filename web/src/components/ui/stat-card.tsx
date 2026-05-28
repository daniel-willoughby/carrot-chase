import type { ReactNode } from "react";
import { AnimatedNumber } from "./animated-number";

type Tone = "orange" | "blue" | "success" | "purple" | "warning" | "neutral";

const toneConfig: Record<
  Tone,
  { accent: string; tintBg: string; valueColor: string; iconColor: string }
> = {
  orange: {
    accent: "var(--orange)",
    tintBg: "var(--orange-light)",
    valueColor: "var(--orange)",
    iconColor: "var(--orange)",
  },
  blue: {
    accent: "var(--blue)",
    tintBg: "var(--blue-light)",
    valueColor: "var(--blue)",
    iconColor: "var(--blue)",
  },
  success: {
    accent: "var(--success)",
    tintBg: "var(--success-light)",
    valueColor: "var(--success)",
    iconColor: "var(--success)",
  },
  purple: {
    accent: "var(--purple)",
    tintBg: "var(--purple-light)",
    valueColor: "var(--purple)",
    iconColor: "var(--purple)",
  },
  warning: {
    accent: "var(--warning)",
    tintBg: "var(--warning-light)",
    valueColor: "var(--warning)",
    iconColor: "var(--warning)",
  },
  neutral: {
    accent: "var(--border-strong)",
    tintBg: "transparent",
    valueColor: "var(--foreground)",
    iconColor: "var(--muted)",
  },
};

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { dir: "up" | "down" | "flat"; text: string };
  tone?: Tone;
  accented?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
};

export function StatCard({
  label,
  value,
  sub,
  trend,
  tone = "neutral",
  accented = false,
  icon,
  onClick,
}: Props) {
  const cfg = toneConfig[tone];
  const showAccent = accented && tone !== "neutral";
  // Prototype parity: every StatCard has a visible 3px top stripe — coloured
  // when toned, tan when neutral.
  const topAccent = showAccent ? cfg.accent : "var(--border-strong)";

  return (
    <div
      onClick={onClick}
      className={[
        "overflow-hidden rounded-2xl border border-[color:var(--border)] bg-card",
        "shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]",
        onClick ? "card-hover cursor-pointer" : "",
      ].join(" ")}
      style={{ borderTop: `3px solid ${topAccent}` }}
    >
      <div
        className="px-5 py-4"
        style={{
          background: showAccent
            ? `color-mix(in srgb, ${cfg.tintBg} 35%, transparent)`
            : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-[color:var(--muted)]">
            {label}
          </div>
          {icon && (
            <div
              className="text-[15px] opacity-60"
              style={{ color: cfg.iconColor }}
              aria-hidden
            >
              {icon}
            </div>
          )}
        </div>

        <div
          className="mt-3 truncate text-[34px] font-extrabold leading-none tracking-tight"
          style={{ color: showAccent ? cfg.valueColor : "var(--foreground)" }}
        >
          <AnimatedNumber value={value} />
        </div>

        {trend && (
          <div
            className="mt-3 flex items-center gap-1 text-xs font-semibold"
            style={{
              color:
                trend.dir === "down"
                  ? "var(--danger)"
                  : trend.dir === "up"
                    ? "var(--success)"
                    : "var(--muted)",
            }}
          >
            {trend.dir === "up" && <span aria-hidden>↑</span>}
            {trend.dir === "down" && <span aria-hidden>↓</span>}
            <span>{trend.text}</span>
          </div>
        )}
        {sub && !trend && (
          <div className="mt-3 text-xs text-[color:var(--muted)]">{sub}</div>
        )}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

type Tone = "neutral" | "orange" | "success" | "danger" | "warning" | "blue" | "purple";

const toneClasses: Record<Tone, string> = {
  neutral:
    "bg-[color:var(--background-subtle)] text-[color:var(--foreground-secondary)]",
  orange: "bg-[color:var(--orange-light)] text-[color:var(--orange-dark)]",
  success: "bg-[color:var(--success-light)] text-[color:var(--success)]",
  danger: "bg-[color:var(--danger-light)] text-[color:var(--danger)]",
  warning: "bg-[color:var(--warning-light)] text-[color:var(--warning)]",
  blue: "bg-[color:var(--blue-light)] text-[color:var(--blue)]",
  purple: "bg-[color:var(--purple-light)] text-[color:var(--purple)]",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={[
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

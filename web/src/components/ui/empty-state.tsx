import type { ReactNode } from "react";
import { NavIcon, ICONS, type IconName } from "./nav-icon";

export function EmptyState({
  icon = "🥕",
  title,
  description,
  action,
}: {
  icon?: ReactNode | IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const isIconName =
    typeof icon === "string" && (ICONS as Record<string, unknown>)[icon];

  return (
    <div className="px-6 py-10 text-center">
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[28px]"
        style={{
          background: "var(--background-subtle)",
          border: "1px solid var(--border)",
        }}
        aria-hidden
      >
        {isIconName ? (
          <NavIcon name={icon as IconName} size={26} style={{ color: "var(--muted)" }} />
        ) : (
          icon
        )}
      </div>
      <div className="text-[15px] font-bold tracking-tight text-[color:var(--foreground)]">
        {title}
      </div>
      {description && (
        <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-relaxed text-[color:var(--muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

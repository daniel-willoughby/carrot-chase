import type { ReactNode } from "react";

/**
 * Standard page header — matches prototype proportions exactly:
 *   fontSize: isMobile ? 22 : 26, fontWeight: 800, no extra letter-spacing
 *   description: 14px muted, mt: 4
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[color:var(--foreground)] sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-[color:var(--muted)] sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

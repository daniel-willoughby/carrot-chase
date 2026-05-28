import type { ReactNode } from "react";

/**
 * Standard page header — matches prototype proportions:
 *   34px extrabold, -0.03em letter-spacing, 15px muted description.
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
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:mb-7">
      <div>
        <h1 className="text-2xl font-extrabold leading-none tracking-tight text-[color:var(--foreground)] sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-[color:var(--muted)] sm:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

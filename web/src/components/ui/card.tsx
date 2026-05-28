import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className = "", interactive, ...rest }: Props) {
  return (
    <div
      className={[
        "rounded-2xl border border-[color:var(--border)] bg-card p-6",
        "shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)]",
        interactive ? "card-hover cursor-pointer" : "",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

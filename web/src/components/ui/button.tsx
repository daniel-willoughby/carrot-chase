import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "xl";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-orange-gradient text-white shadow-[0_2px_8px_rgba(232,82,10,0.28)] hover:opacity-90",
  secondary:
    "bg-[color:var(--background-subtle)] text-[color:var(--foreground-secondary)] border border-[color:var(--border)] hover:bg-[color:var(--background)]",
  outline:
    "bg-transparent text-[color:var(--orange)] border-2 border-[color:var(--orange)] hover:bg-[color:var(--orange-light)]",
  ghost: "bg-transparent text-[color:var(--muted)] hover:text-[color:var(--foreground)]",
  danger:
    "bg-[color:var(--danger)] text-white shadow-[0_2px_8px_rgba(220,38,38,0.22)] hover:opacity-90",
  success:
    "bg-[color:var(--success)] text-white shadow-[0_2px_8px_rgba(22,163,74,0.22)] hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-[13px]",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
  xl: "px-9 py-4 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className = "", variant = "primary", size = "md", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-bold transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});

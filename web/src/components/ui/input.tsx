import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseClasses =
  "block w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] outline-none transition-colors focus:border-[color:var(--orange)] focus:bg-white";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return <input ref={ref} className={[baseClasses, className].join(" ")} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", ...rest }, ref) {
    return (
      <select ref={ref} className={[baseClasses, "appearance-none pr-8", className].join(" ")} {...rest} />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...rest }, ref) {
    return <textarea ref={ref} className={[baseClasses, "min-h-24", className].join(" ")} {...rest} />;
  },
);

export function FormField({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-[color:var(--foreground)]">
        {label}
        {required && <span className="ml-0.5 text-[color:var(--orange)]">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-[color:var(--muted)]">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs font-medium text-[color:var(--danger)]">
          {error}
        </span>
      )}
    </label>
  );
}

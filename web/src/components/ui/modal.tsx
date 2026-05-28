"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, description, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close on backdrop click. The default <dialog> backdrop click does nothing.
  function onBackdropMouseDown(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onMouseDown={onBackdropMouseDown}
      className="m-0 max-w-md rounded-3xl border border-[color:var(--border)] bg-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop:bg-black/40 backdrop:backdrop-blur-sm open:fixed open:inset-0 open:m-auto open:max-h-[90vh] open:overflow-y-auto"
    >
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[color:var(--foreground)]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1 text-[color:var(--muted)] transition-colors hover:bg-[color:var(--background-subtle)] hover:text-[color:var(--foreground)]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

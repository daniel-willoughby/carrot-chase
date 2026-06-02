"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { eraseRunnerAction } from "./actions";

/**
 * Super-admin-only GDPR controls for a runner: export all held data
 * (right of access) and permanently erase it (right to erasure).
 */
export function GdprActions({
  runnerId,
  runnerName,
}: {
  runnerId: string;
  runnerName: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  function erase() {
    startTransition(async () => {
      const res = await eraseRunnerAction(runnerId);
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      showToast(`${runnerName} permanently erased`, "success");
      router.push("/dashboard/super");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/runners/${runnerId}/export`}
        className="rounded-full border px-3.5 py-1.5 text-xs font-bold"
        style={{ borderColor: "var(--border)", color: "var(--foreground-secondary)" }}
        data-no-sfx
      >
        ⬇ Export data
      </a>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border-2 px-3.5 py-1.5 text-xs font-bold"
          style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--danger-light)" }}
        >
          Erase permanently (GDPR)
        </button>
      ) : (
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2"
          style={{ border: "1.5px solid var(--danger)", background: "var(--danger-light)" }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--danger)" }}>
            Type <strong>ERASE</strong> to permanently destroy {runnerName} and
            all their results. No undo.
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ERASE"
            className="w-24 rounded-full px-3 py-1 text-xs"
            style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
          />
          <button
            type="button"
            onClick={erase}
            disabled={confirmText !== "ERASE" || isPending}
            className="rounded-full px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: "var(--danger)" }}
          >
            {isPending ? "Erasing…" : "Confirm erase"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmText("");
            }}
            className="text-xs font-semibold"
            style={{ color: "var(--muted)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

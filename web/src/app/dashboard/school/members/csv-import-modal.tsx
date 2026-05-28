"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { validateCsv, type ParsedRow } from "@/lib/csv";
import { importRunnersAction } from "./actions";

type Group = { id: string; name: string };

type Status = "idle" | "preview" | "submitting" | "done" | "error";

export function CsvImportModal({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [defaultGroupId, setDefaultGroupId] = useState<string>("");
  const [insertedCount, setInsertedCount] = useState(0);
  const [, startTransition] = useTransition();

  function reset() {
    setStatus("idle");
    setRows([]);
    setError(null);
    setInsertedCount(0);
  }

  async function handleFile(file: File) {
    setError(null);
    const text = await file.text();
    const { rows, fatal } = validateCsv(text);
    if (fatal) {
      setError(fatal);
      setStatus("error");
      return;
    }
    if (rows.length === 0) {
      setError("No data rows found.");
      setStatus("error");
      return;
    }
    setRows(rows);
    setStatus("preview");
  }

  function handleSubmit() {
    const validRows = rows
      .filter((r) => r.errors.length === 0)
      .map(({ full_name, year_group, group_name }) => ({
        full_name,
        year_group,
        group_name,
      }));
    if (validRows.length === 0) {
      setError("No valid rows to import.");
      return;
    }
    setStatus("submitting");
    startTransition(async () => {
      const res = await importRunnersAction(validRows, defaultGroupId || null);
      if (res.error) {
        setError(res.error);
        setStatus("error");
      } else {
        setInsertedCount(res.count ?? 0);
        setStatus("done");
      }
    });
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.length - validCount;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Import CSV
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          // Reset only after the dialog has closed for next time.
          setTimeout(reset, 200);
        }}
        title="Import runners from CSV"
        description="Upload a CSV with columns: full_name, year_group, group_name."
      >
        {status === "idle" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--background-subtle)] p-6 text-center">
              <p className="text-sm text-[color:var(--foreground-secondary)]">
                Choose a CSV file to preview.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="mt-3 block w-full cursor-pointer rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm file:hidden hover:bg-[color:var(--background)]"
              />
              <a
                href="/runners-template.csv"
                download
                className="mt-3 inline-block text-xs font-semibold text-[color:var(--orange)] hover:underline"
              >
                Download template
              </a>
            </div>
            {error && (
              <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
                {error}
              </div>
            )}
          </div>
        )}

        {status === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-bold text-[color:var(--success)]">
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="ml-3 font-bold text-[color:var(--danger)]">
                    {invalidCount} invalid
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                Start over
              </button>
            </div>

            <FormField label="Assign all to group (optional)">
              <Select
                value={defaultGroupId}
                onChange={(e) => setDefaultGroupId(e.target.value)}
              >
                <option value="">— none / per-row only —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-[color:var(--border)]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[color:var(--background-subtle)] text-left uppercase tracking-[0.06em] text-[color:var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Year</th>
                    <th className="px-3 py-2 font-semibold">Group</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={
                        r.errors.length > 0
                          ? "border-t border-[color:var(--border)] bg-[color:var(--danger-light)]/30"
                          : "border-t border-[color:var(--border)]"
                      }
                    >
                      <td className="px-3 py-1.5">{r.full_name || "—"}</td>
                      <td className="px-3 py-1.5 text-[color:var(--muted)]">
                        {r.year_group ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-[color:var(--muted)]">
                        {r.group_name ?? "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.errors.length > 0 ? (
                          <span className="text-[color:var(--danger)]">
                            {r.errors.join(", ")}
                          </span>
                        ) : (
                          <span className="text-[color:var(--success)]">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={validCount === 0}
              >
                Import {validCount} runner{validCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {status === "submitting" && (
          <p className="py-6 text-center text-sm text-[color:var(--muted)]">
            Importing…
          </p>
        )}

        {status === "done" && (
          <div className="space-y-4 text-center">
            <div className="text-3xl">🎉</div>
            <div>
              <p className="text-lg font-bold">
                {insertedCount} runner{insertedCount === 1 ? "" : "s"} imported
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                They are now visible in your member list.
              </p>
            </div>
            <Button onClick={() => setOpen(false)} className="w-full justify-center">
              Done
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
              {error}
            </div>
            <Button onClick={reset} className="w-full justify-center">
              Try again
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

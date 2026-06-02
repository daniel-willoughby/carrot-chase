"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { levelColor, fmtSecs } from "@/lib/theme/level";
import { createEventAction, type EventActionState } from "../actions";

type RosterEntry = { id: string; name: string; level: number; pb: number | null };
type Group = {
  id: string;
  name: string;
  memberCount: number;
  roster: RosterEntry[];
};
type Course = {
  id: string;
  name: string;
  distance_metres: number;
  is_platform_preset: boolean;
};

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Details", "Review", "Confirm"] as const;

const FORMAT_HINTS: Record<string, string> = {
  handicap:
    "🐇 Pursuit: runners start in staggered groups by level; slower runners go first. Aim: everyone finishes together.",
  scratch:
    "🏁 Scratch: all runners start simultaneously. First across the line wins outright.",
  relay:
    "🔄 Relay: team event with baton or tag handover. Assign runners to teams after creation. (Phase 2)",
};

export function EventWizard({
  groups,
  courses,
}: {
  groups: Group[];
  courses: Course[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  const [format, setFormat] = useState<string>("handicap");
  const [courseId, setCourseId] = useState<string>(courses[0]?.id ?? "");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const [scheduledAt, setScheduledAt] = useState<string>(
    tomorrow.toISOString().slice(0, 16),
  );
  const [term, setTerm] = useState<string>("Spring Term 2026");
  const [notes, setNotes] = useState<string>("");

  const [state, formAction, isPending] = useActionState<
    EventActionState,
    FormData
  >(createEventAction, {});

  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedCourse = courses.find((c) => c.id === courseId);
  const memberCount = selectedGroup?.memberCount ?? 0;
  const formatLabel =
    format === "handicap"
      ? "Pursuit"
      : format === "scratch"
        ? "Fun Run"
        : format === "relay"
          ? "Relay"
          : format;

  return (
    <form action={formAction} className="space-y-6">
      {/* Persist the step-1 fields across step changes — the inputs in
          step 1 unmount when the wizard advances, so without these hidden
          copies the FormData submitted on step 3 would be missing every
          required field except `term` and `notes`. */}
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="scheduled_at" value={scheduledAt} />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all"
                style={{
                  background: done
                    ? "var(--success)"
                    : active
                      ? "var(--orange)"
                      : "var(--background-subtle)",
                  color: done || active ? "#fff" : "var(--muted)",
                }}
              >
                {done ? "✓" : n}
              </div>
              <span
                className="text-sm font-semibold"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="h-0.5 flex-1 transition-colors"
                  style={{
                    background: done ? "var(--success)" : "var(--border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <Card>
          <h2 className="text-xl font-bold tracking-tight">Race details</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Who is racing, what format, on which course, and when.
          </p>

          <div className="mt-6 space-y-4">
            <FormField label="Group" required>
              <Select
                name="group_id"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                {groups.length === 0 && (
                  <option value="">No groups available</option>
                )}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount}{" "}
                    {g.memberCount === 1 ? "member" : "members"})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Race format" required>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    value: "handicap",
                    label: "Pursuit",
                    sub: "Carrot Algorithm staggered start",
                  },
                  {
                    value: "scratch",
                    label: "Fun Run",
                    sub: "Everyone starts together",
                  },
                  {
                    value: "relay",
                    label: "Relay",
                    sub: "Phase 2",
                    disabled: true,
                  },
                ].map((f) => (
                  <label
                    key={f.value}
                    className={`cursor-pointer rounded-xl border p-3 text-sm transition-all ${
                      f.disabled
                        ? "cursor-not-allowed border-[color:var(--border)] bg-[color:var(--background-subtle)] opacity-50"
                        : format === f.value
                          ? "border-[color:var(--orange)] bg-[color:var(--orange-light)] shadow-[0_0_0_3px_var(--ring)]"
                          : "border-[color:var(--border)] bg-white hover:border-[color:var(--border-strong)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={(e) => setFormat(e.target.value)}
                      disabled={f.disabled}
                      className="sr-only"
                    />
                    <div className="font-bold">{f.label}</div>
                    <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {f.sub}
                    </div>
                  </label>
                ))}
              </div>
              {FORMAT_HINTS[format] && (
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-xs"
                  style={{
                    background: "var(--background-subtle)",
                    color: "var(--muted)",
                  }}
                >
                  {FORMAT_HINTS[format]}
                </div>
              )}
            </FormField>

            <FormField label="Course" required>
              <Select
                name="course_id"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
              >
                <optgroup label="Platform presets">
                  {courses
                    .filter((c) => c.is_platform_preset)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.distance_metres} m)
                      </option>
                    ))}
                </optgroup>
                {courses.some((c) => !c.is_platform_preset) && (
                  <optgroup label="Your courses">
                    {courses
                      .filter((c) => !c.is_platform_preset)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.distance_metres} m)
                        </option>
                      ))}
                  </optgroup>
                )}
              </Select>
            </FormField>

            <FormField label="Date and time" required>
              <Input
                type="datetime-local"
                name="scheduled_at"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!groupId || !courseId || !scheduledAt}
            >
              Review roster →
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Review roster + marshal breakdown ── */}
      {step === 2 && (
        <Card>
          <h2 className="text-xl font-bold tracking-tight">Review roster</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {selectedGroup?.name} · {formatLabel} · {selectedCourse?.name} ·{" "}
            {selectedCourse?.distance_metres}m
          </p>

          {format === "handicap" && (
            <div
              className="mt-5 rounded-xl px-4 py-3 text-xs font-semibold"
              style={{
                background: "var(--orange-light)",
                border: "1px solid var(--orange)",
                color: "var(--orange-dark)",
              }}
            >
              Pursuit format — runners start in staggered groups by level so the
              field finishes together.
            </div>
          )}

          <div className="mt-5">
            <div
              className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em]"
              style={{ color: "var(--muted)" }}
            >
              Roster ({selectedGroup?.roster.length ?? 0})
            </div>
            {!selectedGroup || selectedGroup.roster.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No runners in this group yet. Ask the school admin to add some.
              </p>
            ) : (
              <div className="space-y-0">
                {selectedGroup.roster.map((r) => {
                  const lc = levelColor(r.level);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: lc.bg, color: lc.color }}
                        >
                          L{r.level}
                        </div>
                        <span className="text-sm font-semibold">{r.name}</span>
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        PB {fmtSecs(r.pb)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button type="button" onClick={() => setStep(3)}>
              Continue →
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 3: Confirm + notes/term ── */}
      {step === 3 && (
        <Card>
          <h2 className="text-xl font-bold tracking-tight">Confirm event</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Last check before saving. You can add notes here.
          </p>

          <div
            className="mt-5 rounded-xl p-4"
            style={{ background: "var(--background-subtle)" }}
          >
            {[
              { label: "Group", value: selectedGroup?.name ?? "—" },
              {
                label: "Format",
                value: formatLabel,
              },
              {
                label: "Course",
                value: selectedCourse
                  ? `${selectedCourse.name} (${selectedCourse.distance_metres} m)`
                  : "—",
              },
              {
                label: "Date & time",
                value: scheduledAt
                  ? new Date(scheduledAt).toLocaleString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—",
              },
              {
                label: "Runners",
                value: `${memberCount} registered`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 text-sm"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span style={{ color: "var(--muted)" }}>{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <FormField
              label="Term"
              hint="Optional. Used for the series leaderboard."
            >
              <Input
                name="term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Spring Term 2026"
              />
            </FormField>
            <FormField
              label="Notes"
              hint="Optional notes for this event."
            >
              <Textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. meet at the playground gate, bring water…"
              />
            </FormField>

            {format === "handicap" && (
              <div className="rounded-xl border border-[color:var(--orange)]/30 bg-[color:var(--orange-light)] px-4 py-3 text-sm text-[color:var(--orange-dark)]">
                <strong>Pursuit race</strong> — the Carrot Algorithm calculates
                staggered starts based on each runner&apos;s level. Slower
                runners start earlier.
              </div>
            )}

            {state.error && (
              <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
                {state.error}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "✓ Create event"}
            </Button>
          </div>
        </Card>
      )}
    </form>
  );
}

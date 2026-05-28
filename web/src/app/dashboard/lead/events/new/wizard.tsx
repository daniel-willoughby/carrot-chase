"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createEventAction, type EventActionState } from "../actions";

type Group = { id: string; name: string; memberCount: number };
type Course = { id: string; name: string; distance_metres: number; is_platform_preset: boolean };

export function EventWizard({ groups, courses }: { groups: Group[]; courses: Course[] }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  const [format, setFormat] = useState<string>("handicap");
  const [courseId, setCourseId] = useState<string>(courses[0]?.id ?? "");

  const [state, formAction, isPending] = useActionState<EventActionState, FormData>(
    createEventAction,
    {},
  );

  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedCourse = courses.find((c) => c.id === courseId);
  const projectedMarshals = Math.max(
    2,
    Math.ceil((selectedGroup?.memberCount ?? 0) / 8) + 2,
  );

  // Default datetime: tomorrow 08:00 local.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const defaultDateTime = tomorrow.toISOString().slice(0, 16);

  return (
    <form action={formAction} className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            step === 1
              ? "bg-orange-gradient text-white"
              : "bg-[color:var(--success-light)] text-[color:var(--success)]"
          }`}
        >
          {step === 1 ? "1" : "✓"} <span>Race details</span>
        </div>
        <div className="h-px flex-1 bg-[color:var(--border)]" />
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            step === 2
              ? "bg-orange-gradient text-white"
              : "bg-[color:var(--background-subtle)] text-[color:var(--muted)]"
          }`}
        >
          2 <span>Date &amp; logistics</span>
        </div>
      </div>

      {step === 1 ? (
        <Card>
          <h2 className="text-xl font-bold tracking-tight">Race details</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Who is racing, what format, and on which course.
          </p>

          <div className="mt-6 space-y-4">
            <FormField label="Group" required>
              <Select
                name="group_id"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                {groups.length === 0 && <option value="">No groups available</option>}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount} {g.memberCount === 1 ? "member" : "members"})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Race format" required>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: "handicap", label: "Handicap", sub: "Carrot Algorithm staggered start" },
                  { value: "scratch", label: "Fun Run", sub: "Everyone starts together" },
                  { value: "relay", label: "Relay", sub: "Phase 2", disabled: true },
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
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!groupId || !courseId}
            >
              Next →
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="text-xl font-bold tracking-tight">Date and logistics</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            When does the race happen, and how many marshals do you need?
          </p>

          <div className="mt-6 space-y-4">
            <FormField label="Date and time" required>
              <Input
                type="datetime-local"
                name="scheduled_at"
                defaultValue={defaultDateTime}
                required
              />
            </FormField>

            <FormField
              label="Marshal count"
              hint="Automatically calculated: 1 per 8 runners + start + finish."
            >
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background-subtle)] px-4 py-2.5 text-sm">
                <span className="text-2xl font-bold text-[color:var(--orange)]">
                  {projectedMarshals}
                </span>{" "}
                marshals for{" "}
                <span className="font-semibold">{selectedGroup?.memberCount ?? 0}</span>{" "}
                runners on{" "}
                <span className="font-semibold">{selectedCourse?.name}</span>
              </div>
            </FormField>

            <FormField label="Term" hint="Optional. Used for the series leaderboard.">
              <Input
                name="term"
                placeholder="Spring Term 2026"
                defaultValue="Spring Term 2026"
              />
            </FormField>

            <FormField label="Marshal notes" hint="Optional briefing for marshals.">
              <Textarea
                name="notes"
                placeholder="Marshal 1 at the playground gate, marshal 2 at the finish chute…"
              />
            </FormField>

            {format === "handicap" && (
              <div className="rounded-xl border border-[color:var(--orange)]/30 bg-[color:var(--orange-light)] px-4 py-3 text-sm text-[color:var(--orange-dark)]">
                <strong>Handicap race</strong> — the Carrot Algorithm will calculate
                staggered starts based on each runner&apos;s level. Slower runners
                start earlier.
              </div>
            )}

            {state.error && (
              <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger-light)] px-3 py-2 text-sm text-[color:var(--danger)]">
                {state.error}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create event →"}
            </Button>
          </div>
        </Card>
      )}
    </form>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { levelColor, fmtSecs } from "@/lib/theme/level";
import { useRouter } from "next/navigation";
import {
  commitResultsAction,
  addLateArrivalAction,
  type Finisher,
} from "./actions";
import { enqueueResult, isOnline } from "@/lib/offline/result-queue";

type Runner = {
  id: string;
  name: string;
  level: number;
  pb: number | null;
  streak: number;
};

type Step = "attendance" | "start" | "finish" | "match";

const STEP_LABELS: Record<Step, string> = {
  attendance: "Attendance",
  start: "Start Order",
  finish: "Timing",
  match: "Match Names",
};

const STEPS: Step[] = ["attendance", "start", "finish", "match"];

const DNF = "__DNF__";

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function ordinal(n: number) {
  const v = n % 100;
  const s = ["th", "st", "nd", "rd"];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function carrotTarget(r: Runner): number {
  // PB serves as our best proxy for "second-fastest of last 5" in a live setting.
  // Falls back to a level-derived estimate so new runners still bucket correctly.
  if (r.pb && r.pb > 0) return r.pb;
  return 170 + (r.level / 99) * 550; // mirrors pace_to_level inverse
}

function tone(
  ctx: AudioContext,
  freq: number,
  dur: number,
  gain = 0.18,
  offset = 0,
  type: OscillatorType = "sine",
) {
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime + offset);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + dur);
    o.start(ctx.currentTime + offset);
    o.stop(ctx.currentTime + offset + dur);
  } catch {}
}

export function RunEventClient({
  eventId,
  groupId,
  format,
  runners: initialRunners,
}: {
  eventId: string;
  groupId: string;
  format: string;
  runners: Runner[];
}) {
  const showToast = useToast();
  const router = useRouter();
  const audioRef = useRef<AudioContext | null>(null);

  function getAudio() {
    if (!audioRef.current) {
      try {
        audioRef.current = new (window.AudioContext ||
          (window as typeof window & {
            webkitAudioContext: typeof AudioContext;
          }).webkitAudioContext)();
      } catch {}
    }
    return audioRef.current;
  }

  function playTick() {
    const c = getAudio();
    if (c) tone(c, 330, 0.08, 0.08);
  }
  function playGo() {
    const c = getAudio();
    if (!c) return;
    tone(c, 440, 0.12, 0.2, 0);
    tone(c, 550, 0.12, 0.2, 0.18);
    tone(c, 660, 0.12, 0.2, 0.36);
    tone(c, 880, 0.35, 0.28, 0.55);
  }
  function playTap() {
    const c = getAudio();
    if (!c) return;
    tone(c, 160, 0.09, 0.09);
    tone(c, 320, 0.06, 0.04);
  }
  function playAssign() {
    const c = getAudio();
    if (!c) return;
    tone(c, 880, 0.07, 0.03);
    tone(c, 1100, 0.05, 0.018, 0.06);
  }

  // ── Step + runners state ─────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("attendance");
  const [runners, setRunners] = useState<Runner[]>(initialRunners);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const presentRunners = useMemo(
    () => runners.filter((r) => presentIds.has(r.id)),
    [runners, presentIds],
  );

  // ── Stagger groups ───────────────────────────────────────────────────────
  const isHandicap = format === "handicap" || format === "pursuit";

  const startGroups = useMemo(() => {
    if (!isHandicap) return [presentRunners];
    const slow = presentRunners
      .filter((r) => r.level >= 65)
      .sort((a, b) => carrotTarget(b) - carrotTarget(a));
    const mid = presentRunners
      .filter((r) => r.level >= 45 && r.level < 65)
      .sort((a, b) => carrotTarget(b) - carrotTarget(a));
    const fast = presentRunners
      .filter((r) => r.level < 45)
      .sort((a, b) => carrotTarget(b) - carrotTarget(a));
    return [slow, mid, fast].filter((g) => g.length > 0);
  }, [presentRunners, isHandicap]);

  function staggerGap(gi: number) {
    if (gi + 1 >= startGroups.length) return 0;
    const avg = (arr: Runner[]) =>
      arr.reduce((s, r) => s + carrotTarget(r), 0) / arr.length;
    return Math.min(
      120,
      Math.max(10, Math.round(avg(startGroups[gi]) - avg(startGroups[gi + 1]))),
    );
  }

  const groupOffsets = useMemo(() => {
    return startGroups.map((_, gi) => {
      let off = 0;
      for (let j = gi; j < startGroups.length - 1; j++) off += staggerGap(j);
      return off;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGroups]);

  // ── Late arrival ─────────────────────────────────────────────────────────
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateName, setLateName] = useState("");
  const [lateBusy, setLateBusy] = useState(false);

  async function submitLateArrival() {
    setLateBusy(true);
    const res = await addLateArrivalAction(groupId, lateName);
    setLateBusy(false);
    if (res.error || !res.runner) {
      showToast(res.error ?? "Could not add runner", "error");
      return;
    }
    const r = res.runner;
    const newRunner: Runner = {
      id: r.id,
      name: r.full_name,
      level: r.current_level,
      pb: r.personal_best_seconds,
      streak: r.streak_count,
    };
    setRunners((prev) => [...prev, newRunner]);
    setPresentIds((prev) => new Set(prev).add(r.id));
    setLateName("");
    setShowLateModal(false);
    showToast(`${r.full_name} added`, "success");
  }

  // ── Start phase: per-group countdowns + stagger gap timers ───────────────
  const [groupStarted, setGroupStarted] = useState(0); // how many groups have started
  const [phase, setPhase] = useState<"idle" | "countdown" | "gap">("idle");
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const phaseTimerRef = useRef<number | null>(null);

  function clearPhaseTimer() {
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  function startGroupCountdown(gi: number) {
    clearPhaseTimer();
    setPhase("countdown");
    setPhaseSeconds(3);
  }

  // Tick the current phase down
  useEffect(() => {
    if (phase === "idle") return;
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    phaseTimerRef.current = window.setInterval(() => {
      setPhaseSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearPhaseTimer();
  }, [phase]);

  // Phase tick — play audio + transition
  useEffect(() => {
    if (phase === "countdown") {
      if (phaseSeconds === 0) {
        // GO
        playGo();
        const nextGroupStarted = groupStarted + 1;
        setGroupStarted(nextGroupStarted);
        clearPhaseTimer();
        if (nextGroupStarted < startGroups.length) {
          const gap = staggerGap(nextGroupStarted - 1);
          setPhase("gap");
          setPhaseSeconds(gap);
        } else {
          setPhase("idle");
        }
      } else {
        playTick();
      }
    } else if (phase === "gap") {
      if (phaseSeconds === 0) {
        clearPhaseTimer();
        setPhase("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseSeconds]);

  function skipCurrentPhase() {
    setPhaseSeconds(0);
  }

  // ── Finish phase: race clock + tap times ─────────────────────────────────
  const [raceTime, setRaceTime] = useState(0);
  const raceStartRef = useRef<number | null>(null);
  const raceTickRef = useRef<number | null>(null);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tapping, setTapping] = useState(false);

  function beginFinishStep() {
    setStep("finish");
    raceStartRef.current = Date.now();
    setRaceTime(0);
    if (raceTickRef.current) clearInterval(raceTickRef.current);
    raceTickRef.current = window.setInterval(() => {
      setRaceTime(
        Math.round((Date.now() - (raceStartRef.current ?? Date.now())) / 1000),
      );
    }, 250);
  }

  useEffect(() => {
    return () => {
      if (raceTickRef.current) clearInterval(raceTickRef.current);
      clearPhaseTimer();
    };
  }, []);

  function handleTap() {
    if (tapTimes.length >= presentRunners.length) return;
    setTapping(true);
    setTimeout(() => setTapping(false), 250);
    playTap();
    const elapsed = raceStartRef.current
      ? Math.round((Date.now() - raceStartRef.current) / 1000)
      : 0;
    setTapTimes((prev) => [...prev, elapsed]);
  }

  // Auto-advance when all groups have started → finish step
  useEffect(() => {
    if (
      step === "start" &&
      groupStarted === startGroups.length &&
      phase === "idle" &&
      startGroups.length > 0
    ) {
      // Race clock kicks in here in the prototype
      beginFinishStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, groupStarted, phase, startGroups.length]);

  // ── Match phase: positions[] + assignedSet + dnfSet ──────────────────────
  // positions[i] = runner.id assigned to finish slot i, or DNF sentinel, or null
  const [positions, setPositions] = useState<(string | null)[]>([]);
  const [selectedPos, setSelectedPos] = useState<number | null>(0);
  const [dnfIds, setDnfIds] = useState<Set<string>>(new Set());
  const [showDnfPicker, setShowDnfPicker] = useState(false);
  const [dnfPickerSel, setDnfPickerSel] = useState<Set<string>>(new Set());

  function goToMatch() {
    if (raceTickRef.current) clearInterval(raceTickRef.current);
    setPositions(Array(tapTimes.length).fill(null));
    setSelectedPos(0);
    setStep("match");
  }

  function assignRunner(runnerId: string) {
    if (selectedPos === null) return;
    if (dnfIds.has(runnerId)) return;
    playAssign();
    setPositions((prev) => {
      const next = [...prev];
      // free this runner from any other slot
      for (let i = 0; i < next.length; i++) if (next[i] === runnerId) next[i] = null;
      next[selectedPos] = runnerId;
      // move selection to next empty slot
      const nextEmpty = next.findIndex((p, i) => i > selectedPos && p === null);
      setSelectedPos(nextEmpty === -1 ? null : nextEmpty);
      return next;
    });
  }

  function clearPosition(idx: number) {
    setPositions((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setSelectedPos(idx);
  }

  function openDnfPicker() {
    setDnfPickerSel(new Set());
    setShowDnfPicker(true);
  }

  function confirmDnfPicker() {
    const next = new Set(dnfIds);
    for (const id of dnfPickerSel) next.add(id);
    setDnfIds(next);
    // Fill any empty positions with DNF marker
    setPositions((prev) => prev.map((p) => (p === null ? DNF : p)));
    setShowDnfPicker(false);
    setDnfPickerSel(new Set());
  }

  const unaccountedRunners = presentRunners.filter(
    (r) => !positions.includes(r.id) && !dnfIds.has(r.id),
  );
  const emptyPositions = positions.filter((p) => p === null).length;
  const allResolved =
    step === "match" && emptyPositions === 0 && unaccountedRunners.length === 0;

  // ── Commit ───────────────────────────────────────────────────────────────
  const [isPending, startTransition] = useTransition();

  function runnerGroupIdx(runnerId: string) {
    for (let g = 0; g < startGroups.length; g++) {
      if (startGroups[g].some((r) => r.id === runnerId)) return g;
    }
    return startGroups.length - 1;
  }

  function commit() {
    const finishers: Finisher[] = [];

    for (let i = 0; i < positions.length; i++) {
      const slot = positions[i];
      const rawTime = tapTimes[i];
      if (slot === DNF || slot === null) {
        // unattributed slot — skip; the runner who DNF'd will be added below
        continue;
      }
      const offset = groupOffsets[runnerGroupIdx(slot)] ?? 0;
      finishers.push({
        runner_id: slot,
        finish_seconds: rawTime,
        adjusted_seconds: rawTime + offset,
      });
    }

    // Mark all DNFs (present runners not in positions)
    const placed = new Set(positions.filter((p): p is string => !!p && p !== DNF));
    for (const r of presentRunners) {
      if (!placed.has(r.id)) {
        finishers.push({ runner_id: r.id, finish_seconds: null });
      }
    }
    // Plus explicit DNF set (in case any slipped through)
    for (const id of dnfIds) {
      if (![...placed].includes(id)) {
        if (!finishers.some((f) => f.runner_id === id)) {
          finishers.push({ runner_id: id, finish_seconds: null });
        }
      }
    }

    startTransition(async () => {
      // Offline-first: if no network, queue + bail. The OfflineReplayer
      // drains the queue when we come back online.
      if (!isOnline()) {
        try {
          await enqueueResult(eventId, finishers);
          showToast(
            "Saved locally — will sync when back online",
            "success",
          );
          router.push("/dashboard/lead/events");
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Could not save locally",
            "error",
          );
        }
        return;
      }

      try {
        const res = await commitResultsAction(eventId, finishers);
        if (res && "error" in res && res.error) {
          showToast(res.error, "error");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Server action's success path throws NEXT_REDIRECT — let it propagate
        if (msg.includes("NEXT_REDIRECT")) throw err;
        // Network failure mid-flight: queue + recover.
        try {
          await enqueueResult(eventId, finishers);
          showToast(
            "Network failed — saved locally, will retry",
            "success",
          );
          router.push("/dashboard/lead/events");
        } catch {
          showToast("Could not save results", "error");
        }
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const stepIdx = STEPS.indexOf(step);

  return (
    <>
      {/* Step progress */}
      <div className="mb-6 flex items-center justify-center">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="flex items-center justify-center rounded-full text-[11px] font-extrabold transition-all"
                  style={{
                    width: active ? 30 : 24,
                    height: active ? 30 : 24,
                    background: done || active ? "var(--orange)" : "var(--card)",
                    border: `2px solid ${done || active ? "var(--orange)" : "var(--border)"}`,
                    color: done || active ? "#fff" : "var(--muted)",
                    boxShadow: active ? "0 0 0 4px var(--orange-light)" : undefined,
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div
                  className="whitespace-nowrap text-[10px]"
                  style={{
                    color: active ? "var(--orange)" : "var(--muted)",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {STEP_LABELS[s]}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="mx-1 h-0.5 w-7 transition-colors"
                  style={{ background: done ? "var(--orange)" : "var(--border)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ───── Step 1: Attendance ───── */}
      {step === "attendance" && (
        <>
          <Card className="mb-4">
            <div className="mb-3 text-base font-bold">Mark Attendance</div>
            <div className="mb-3.5 flex items-center justify-between gap-2.5">
              <div
                className="flex-1 rounded-xl py-2.5 text-center text-[15px] font-extrabold"
                style={{
                  background:
                    presentRunners.length > 0
                      ? "var(--success-light)"
                      : "var(--danger-light)",
                  color:
                    presentRunners.length > 0
                      ? "var(--success)"
                      : "var(--danger)",
                }}
              >
                {presentRunners.length}/{runners.length} present
              </div>
              <button
                onClick={() => setPresentIds(new Set(runners.map((r) => r.id)))}
                className="flex-1 rounded-xl py-2.5 text-[15px] font-extrabold text-white"
                style={{
                  background: "var(--success)",
                  boxShadow: "0 4px 14px rgba(22,163,74,0.35)",
                }}
              >
                ✓ Mark all
              </button>
            </div>

            {runners.map((r) => {
              const present = presentIds.has(r.id);
              const lc = levelColor(r.level);
              return (
                <button
                  key={r.id}
                  onClick={() =>
                    setPresentIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(r.id)) next.delete(r.id);
                      else next.add(r.id);
                      return next;
                    })
                  }
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between px-2 py-2.5 text-left transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: present ? "var(--success-light)" : "transparent",
                    borderRadius: 8,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                      style={{ background: lc.bg, color: lc.color }}
                    >
                      L{r.level}
                    </div>
                    <span className="text-[15px] font-semibold">{r.name}</span>
                  </div>
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: present
                        ? "var(--success)"
                        : "var(--border-strong)",
                    }}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </Card>

          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setShowLateModal(true)}
              className="shrink-0"
            >
              + Late arrival
            </Button>
            <Button
              size="xl"
              onClick={() => setStep("start")}
              disabled={presentRunners.length < 2}
              className="flex-1 justify-center"
            >
              Begin Race ({presentRunners.length}) →
            </Button>
          </div>

          {showLateModal && (
            <div
              className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto px-4 pb-4 pt-16"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => !lateBusy && setShowLateModal(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl p-6"
                style={{ background: "var(--card)", boxShadow: "var(--shadow-lg)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-lg font-extrabold tracking-tight">
                  Late arrival
                </div>
                <p
                  className="mt-1 mb-4 text-[13px]"
                  style={{ color: "var(--muted)" }}
                >
                  Add a runner who turned up after registration closed.
                </p>
                <label className="mb-1.5 block text-[13px] font-semibold">
                  Full name
                </label>
                <input
                  value={lateName}
                  onChange={(e) => setLateName(e.target.value)}
                  placeholder="e.g. Mia Robinson"
                  autoCapitalize="words"
                  autoFocus
                  className="mb-4 w-full rounded-xl px-3.5 py-2.5 text-sm"
                  style={{ border: "1.5px solid var(--border)" }}
                />
                <div className="flex gap-2.5">
                  <Button
                    onClick={submitLateArrival}
                    disabled={!lateName.trim() || lateBusy}
                    className="flex-1 justify-center"
                  >
                    {lateBusy ? "Adding…" : "Add & Mark Present"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowLateModal(false);
                      setLateName("");
                    }}
                    disabled={lateBusy}
                    className="flex-1 justify-center"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ───── Step 2: Start Order (per-group stagger) ───── */}
      {step === "start" && (
        <>
          <div
            className="mb-4 text-sm"
            style={{ color: "var(--muted)" }}
          >
            {isHandicap
              ? "Pursuit stagger: slower runners start first for a fair finish."
              : "Scratch start: everyone goes together."}
          </div>

          {startGroups.map((grp, gi) => {
            const started = groupStarted > gi;
            const current = groupStarted === gi;
            const waiting = groupStarted < gi;
            const inCountdown = current && phase === "countdown";
            const inGap = current && phase === "gap" && gi > 0; // shouldn't happen normally
            // Show gap timer on the *next* group while it's gap-waiting
            const showGapBefore = gi > 0 && groupStarted === gi && phase === "gap";

            return (
              <Card
                key={gi}
                className="mb-4"
                style={{ opacity: waiting ? 0.55 : 1 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[15px] font-bold">
                    Group {gi + 1}{" "}
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--muted)" }}
                    >
                      {gi === 0
                        ? "(Slowest, first to start)"
                        : gi === startGroups.length - 1
                          ? "(Fastest, last to start)"
                          : "(Middle)"}
                    </span>
                  </div>
                  {started && <Badge tone="success">Started ✓</Badge>}
                </div>

                {grp.map((r) => {
                  const lc = levelColor(r.level);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-2.5 py-1.5"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ background: lc.bg, color: lc.color }}
                      >
                        L{r.level}
                      </span>
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span
                        className="ml-auto text-[11px]"
                        style={{ color: "var(--muted)" }}
                      >
                        🎯 {fmtSecs(Math.round(carrotTarget(r)))}
                      </span>
                    </div>
                  );
                })}

                {showGapBefore && (
                  <div
                    className="mt-4 rounded-xl p-4 text-center"
                    style={{ background: "var(--orange-light)" }}
                  >
                    <div
                      className="mb-1 text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      GROUP {gi + 1} STARTS IN · {staggerGap(gi - 1)}s gap
                    </div>
                    <div
                      className="font-mono text-[40px] font-extrabold tabular-nums"
                      style={{ color: "var(--orange)" }}
                    >
                      {fmtClock(phaseSeconds)}
                    </div>
                    <button
                      onClick={skipCurrentPhase}
                      className="mt-2 text-[11px] underline"
                      style={{ color: "var(--muted)" }}
                    >
                      skip countdown
                    </button>
                  </div>
                )}

                {current && phase === "idle" && (
                  <Button
                    size="lg"
                    className="mt-4 w-full justify-center"
                    onClick={() => startGroupCountdown(gi)}
                  >
                    START GROUP {gi + 1}
                  </Button>
                )}

                {inCountdown && (
                  <div
                    className="mt-4 rounded-xl p-4 text-center"
                    style={{ background: "var(--orange-light)" }}
                  >
                    <div
                      className="mb-1 text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      GET READY…
                    </div>
                    <div
                      className="font-mono text-[80px] font-black leading-none tabular-nums"
                      style={{ color: "var(--orange)" }}
                    >
                      {phaseSeconds === 0 ? "GO!" : phaseSeconds}
                    </div>
                    <button
                      onClick={skipCurrentPhase}
                      className="mt-2 text-[11px] underline"
                      style={{ color: "var(--muted)" }}
                    >
                      skip countdown
                    </button>
                  </div>
                )}

                {inGap && (
                  <div
                    className="mt-4 rounded-xl p-4 text-center"
                    style={{ background: "var(--orange-light)" }}
                  >
                    <div
                      className="font-mono text-[40px] font-extrabold tabular-nums"
                      style={{ color: "var(--orange)" }}
                    >
                      {fmtClock(phaseSeconds)}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}

      {/* ───── Step 3: Finish recording ───── */}
      {step === "finish" && (
        <>
          <Card className="mb-4 text-center">
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>
              Race time
            </div>
            <div
              className="mt-1 font-mono text-[48px] font-extrabold tabular-nums"
              style={{ color: "var(--foreground)" }}
            >
              {fmtClock(raceTime)}
            </div>
          </Card>

          <button
            onClick={handleTap}
            disabled={tapTimes.length >= presentRunners.length}
            className={`${tapTimes.length < presentRunners.length && !tapping ? "tap-pulse" : ""} ${tapping ? "tap-flash" : ""} mb-4 w-full rounded-2xl py-9 text-2xl font-extrabold text-white transition-colors`}
            style={{
              background:
                tapTimes.length >= presentRunners.length
                  ? "var(--border-strong)"
                  : "var(--orange)",
              cursor:
                tapTimes.length >= presentRunners.length ? "default" : "pointer",
            }}
          >
            {tapTimes.length >= presentRunners.length
              ? "✓ All runners accounted for!"
              : "TAP WHEN RUNNER FINISHES"}
          </button>

          {tapTimes.length > 0 && (
            <Card className="mb-4 text-center">
              <div
                className="text-[40px] font-extrabold"
                style={{ color: "var(--orange)" }}
              >
                {tapTimes.length}
              </div>
              <div
                className="text-sm"
                style={{ color: "var(--muted)" }}
              >
                {tapTimes.length === 1
                  ? "finisher recorded"
                  : "finishers recorded"}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {tapTimes.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full px-2.5 py-0.5 text-[13px] font-bold"
                    style={{
                      background: "var(--orange-light)",
                      color: "var(--orange)",
                    }}
                  >
                    {ordinal(i + 1)} · {fmtSecs(t)}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {tapTimes.length >= presentRunners.length && (
            <Button
              size="xl"
              onClick={goToMatch}
              className="w-full justify-center"
            >
              Match Names →
            </Button>
          )}
        </>
      )}

      {/* ───── Step 4: Name match ───── */}
      {step === "match" && (
        <>
          <div className="mb-1 text-[15px] font-bold">
            Match finish positions to runners
          </div>
          <p
            className="mb-4 text-xs"
            style={{ color: "var(--muted)" }}
          >
            Tap a position to select or unassign it, then tap a runner to assign.
          </p>

          <div
            className="mb-4 grid gap-2"
            style={{ gridTemplateColumns: "45% 55%" }}
          >
            {/* Positions */}
            <div>
              <div
                className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ color: "var(--muted)" }}
              >
                Positions
              </div>
              {tapTimes.map((t, i) => {
                const slot = positions[i];
                const isDnf = slot === DNF;
                const isSel = selectedPos === i;
                const runner = runners.find((r) => r.id === slot);
                const borderCol = isSel
                  ? "var(--orange)"
                  : isDnf
                    ? "var(--danger)"
                    : runner
                      ? "var(--success)"
                      : "var(--border)";
                const bg = isDnf
                  ? "var(--danger-light)"
                  : isSel
                    ? "var(--orange-light)"
                    : runner
                      ? "var(--success-light)"
                      : "var(--card)";
                const labelColor = isDnf
                  ? "var(--danger)"
                  : runner
                    ? "var(--success)"
                    : "var(--orange)";
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (isDnf) {
                        clearPosition(i);
                        return;
                      }
                      if (runner) {
                        clearPosition(i);
                        return;
                      }
                      setSelectedPos(i);
                    }}
                    className="mb-1.5 flex w-full items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-left text-[13px]"
                    style={{
                      border: `2px solid ${borderCol}`,
                      background: bg,
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: labelColor, minWidth: 26 }}
                    >
                      {ordinal(i + 1)}
                    </span>
                    <span
                      className="flex-1 truncate text-xs font-semibold"
                      style={{
                        color: runner ? "var(--foreground)" : "var(--muted)",
                      }}
                    >
                      {isDnf ? "DNF" : runner ? runner.name : "—"}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[10px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {fmtSecs(t)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Runners */}
            <div>
              <div
                className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ color: "var(--muted)" }}
              >
                Runners
              </div>
              {[...presentRunners]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r) => {
                  const isAssigned = positions.includes(r.id);
                  const isDnf = dnfIds.has(r.id);
                  const disabled = isAssigned || isDnf;
                  return (
                    <button
                      key={r.id}
                      onClick={() => !disabled && assignRunner(r.id)}
                      disabled={disabled}
                      className="mb-1.5 flex w-full items-center rounded-[10px] px-2 py-2.5 text-left text-[13px]"
                      style={{
                        border: `2px solid ${isDnf ? "var(--danger)" : isAssigned ? "var(--border)" : "var(--border)"}`,
                        background: isDnf
                          ? "var(--danger-light)"
                          : isAssigned
                            ? "var(--background-subtle)"
                            : "var(--card)",
                        opacity: disabled ? 0.45 : 1,
                        textDecoration: disabled ? "line-through" : "none",
                        color: isDnf ? "var(--danger)" : "var(--foreground)",
                        fontWeight: 500,
                      }}
                    >
                      <span className="truncate">{r.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {showDnfPicker && (
            <div
              className="mb-3 rounded-2xl p-4"
              style={{
                background: "var(--danger-light)",
                border: "1.5px solid var(--danger)",
              }}
            >
              <div
                className="mb-2.5 text-sm font-bold"
                style={{ color: "var(--danger)" }}
              >
                Who didn&apos;t finish?
              </div>
              {unaccountedRunners.length === 0 ? (
                <div
                  className="text-[13px]"
                  style={{ color: "var(--muted)" }}
                >
                  All runners are accounted for.
                </div>
              ) : (
                unaccountedRunners.map((r) => {
                  const checked = dnfPickerSel.has(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-center gap-2.5 py-1.5"
                      style={{
                        borderBottom: "1px solid rgba(220,38,38,0.15)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setDnfPickerSel((prev) => {
                            const next = new Set(prev);
                            if (checked) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                        className="h-4 w-4"
                        style={{ accentColor: "var(--danger)" }}
                      />
                      <span className="text-sm font-semibold">{r.name}</span>
                    </label>
                  );
                })
              )}
              <div className="mt-3 flex gap-2.5">
                <Button
                  variant="danger"
                  onClick={confirmDnfPicker}
                  className="flex-1 justify-center"
                >
                  Confirm DNF
                  {dnfPickerSel.size > 0 ? ` (${dnfPickerSel.size})` : ""}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDnfPicker(false);
                    setDnfPickerSel(new Set());
                  }}
                  className="flex-1 justify-center"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!showDnfPicker && unaccountedRunners.length > 0 && (
            <Button
              variant="outline"
              onClick={openDnfPicker}
              className="mb-3 w-full justify-center"
              style={{
                borderColor: "var(--danger)",
                color: "var(--danger)",
              }}
            >
              Mark DNF ({unaccountedRunners.length} unaccounted)
            </Button>
          )}

          {!allResolved && (
            <div
              className="mb-3 rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold"
              style={{
                background: "var(--warning-light)",
                color: "var(--warning)",
                border: "1px solid #fde68a",
              }}
            >
              ⚠{" "}
              {[
                emptyPositions > 0
                  ? `${emptyPositions} position${emptyPositions !== 1 ? "s" : ""} unassigned`
                  : null,
                unaccountedRunners.length > 0
                  ? `${unaccountedRunners.length} runner${unaccountedRunners.length !== 1 ? "s" : ""} need${unaccountedRunners.length === 1 ? "s" : ""} assigning or DNF`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}

          <Button
            size="xl"
            onClick={commit}
            disabled={!allResolved || isPending}
            className="w-full justify-center"
          >
            {isPending ? "Saving…" : "✓ Confirm results"}
          </Button>
        </>
      )}
    </>
  );
}

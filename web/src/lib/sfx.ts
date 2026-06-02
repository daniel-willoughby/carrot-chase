/**
 * Lightweight Web Audio sound effects, ported from the prototype.
 *
 * No audio assets — every sound is synthesised with oscillators, so it adds
 * zero network weight and works offline. Client-only: all calls are guarded so
 * importing this in a server component (or before the AudioContext can be
 * created) is a harmless no-op. The AudioContext is created lazily on first
 * use, after a user gesture, satisfying browser autoplay policies.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // A suspended context (autoplay policy) resumes on the first gesture-driven call.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  gain = 0.15,
  type: OscillatorType = "sine",
  t = 0,
) {
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + dur);
    o.start(c.currentTime + t);
    o.stop(c.currentTime + t + dur);
  } catch {
    // ignore — audio is non-essential
  }
}

export const sfx = {
  /** Soft tick when marking a runner present. */
  tick() {
    tone(700, 0.055, 0.025);
  },
  /** Satisfying thud when tapping a finisher. */
  tap() {
    tone(160, 0.09, 0.09);
    tone(320, 0.06, 0.04);
  },
  /** Gentle chime when assigning a runner to a finish position. */
  assign() {
    tone(880, 0.07, 0.03);
    tone(1100, 0.05, 0.018, "sine", 0.06);
  },
  /** Three ascending beeps + a higher GO tone when a start group launches. */
  groupStart() {
    tone(440, 0.12, 0.2, "sine", 0.0);
    tone(550, 0.12, 0.2, "sine", 0.18);
    tone(660, 0.12, 0.2, "sine", 0.36);
    tone(880, 0.35, 0.28, "sine", 0.55);
  },
  /** Soft blip on each countdown second. */
  countdownTick() {
    tone(330, 0.08, 0.08);
  },
  /** Triumphant fanfare for Race Complete. */
  fanfare() {
    (
      [
        [523, 0.18, 0.3, 0.0],
        [659, 0.18, 0.3, 0.14],
        [784, 0.18, 0.3, 0.28],
        [1047, 0.55, 0.42, 0.43],
        [784, 0.18, 0.28, 0.55],
        [1047, 0.7, 0.45, 0.72],
      ] as const
    ).forEach(([f, d, g, t]) => tone(f, d, g, "sine", t));
    tone(659, 0.7, 0.18, "sine", 0.43);
    tone(523, 0.7, 0.13, "sine", 0.43);
  },
  /** Very soft tap for generic button presses. */
  click() {
    tone(600, 0.04, 0.018);
  },
  /** Soft ascending two-note for positive confirmations (add/save/create). */
  confirm() {
    tone(523, 0.07, 0.022);
    tone(784, 0.1, 0.028, "sine", 0.08);
  },
  /** Soft descending two-note for dismiss / cancel / back. */
  dismiss() {
    tone(440, 0.07, 0.02);
    tone(330, 0.09, 0.022, "sine", 0.07);
  },
  /** Gentle ascending three-note for a successful login. */
  login() {
    tone(523, 0.06, 0.02);
    tone(659, 0.06, 0.022, "sine", 0.09);
    tone(784, 0.1, 0.028, "sine", 0.18);
  },
};

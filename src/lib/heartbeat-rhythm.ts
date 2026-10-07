export interface HeartbeatStep {
  /** Seconds since the previous beat. */
  gap: number;
  /** Strength of the beat, 1 being normal. */
  amp: number;
  /** A wide, early beat that breaks the pattern. Unused by the current rhythm. */
  premature: boolean;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Shared by the heart-monitor line and the audio: a slow, uncertain, failing pulse.
 * It is never rushed: beats sit roughly 1.3-3 s apart, wandering unpredictably, with
 * the odd hesitation, and each beat is a little weaker than the last. Then the heart
 * misses for a long, almost-flat stretch and returns faint and unsure.
 */
export function* heartbeatRhythm(): Generator<HeartbeatStep, never, undefined> {
  let phase = rand(0, Math.PI * 2);
  while (true) {
    const run = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < run; i++) {
      phase += rand(0.5, 1.5);
      const drift = 1 + 0.18 * Math.sin(phase);
      const hesitation = Math.random() < 0.28 ? rand(0.5, 1.2) : 0;
      const fade = (i / run) * 0.45;
      yield {
        gap: Math.max(1.3, 1.75 * drift * rand(0.92, 1.12) + hesitation),
        amp: Math.max(0.35, 0.9 - fade + rand(-0.06, 0.06)),
        premature: false,
      };
    }
    yield { gap: rand(3.6, 5), amp: 0.28, premature: false };
    yield { gap: rand(2.2, 2.8), amp: 0.5, premature: false };
    yield { gap: rand(1.8, 2.4), amp: 0.7, premature: false };
  }
}

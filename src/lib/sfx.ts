/**
 * UI sound effects, synthesised to match the game's mood: dull, low, mechanical,
 * with a hint of dead radio. Browser only; silent until the audio context is primed.
 */
import { audioEngine, rand } from "./audio-engine";

let sfxBus: GainNode | null = null;
let lastPlayedAt = 0;

function bus(ctx: AudioContext): GainNode {
  if (sfxBus) return sfxBus;
  const gain = ctx.createGain();
  gain.gain.value = 0.9;
  gain.connect(audioEngine.out!);
  const send = ctx.createGain();
  send.gain.value = 0.28;
  gain.connect(send).connect(audioEngine.reverbSend!);
  sfxBus = gain;
  return gain;
}

function ready(): AudioContext | null {
  const ctx = audioEngine.ctx;
  if (!ctx || audioEngine.muted || ctx.state !== "running") return null;
  const now = performance.now();
  if (now - lastPlayedAt < 35) return null;
  lastPlayedAt = now;
  return ctx;
}

function thud(ctx: AudioContext, time: number, level: number, startHz: number, endHz: number, length: number) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(startHz, time);
  osc.frequency.exponentialRampToValueAtTime(endHz, time + length * 0.6);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(level, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  osc.connect(filter).connect(gain).connect(bus(ctx));
  osc.start(time);
  osc.stop(time + length + 0.05);
}

function crackle(ctx: AudioContext, time: number, level: number, hz: number, length: number) {
  const source = ctx.createBufferSource();
  source.buffer = audioEngine.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hz;
  filter.Q.value = 2.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  source.connect(filter).connect(gain).connect(bus(ctx));
  source.start(time, rand(0, 4));
  source.stop(time + length + 0.02);
}

function ping(ctx: AudioContext, time: number, level: number, hz: number, length: number) {
  for (const [ratio, share] of [
    [1, 1],
    [2.76, 0.4],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz * ratio;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level * share, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(gain).connect(bus(ctx));
    osc.start(time);
    osc.stop(time + length + 0.05);
  }
}

export const sfx = {
  /** Ordinary press: a dull relay knock with a dry tick and a faint metallic ring. */
  click(): void {
    const ctx = ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    thud(ctx, t, 0.14, rand(135, 155), 55, 0.14);
    crackle(ctx, t, 0.05, rand(2800, 3600), 0.03);
    ping(ctx, t, 0.01, rand(1050, 1250), 0.4);
  },

  /** Important press (create, start, ready): a heartbeat, lub-dub, with a burst of static. */
  confirm(): void {
    const ctx = ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    thud(ctx, t, 0.22, 85, 36, 0.3);
    thud(ctx, t + 0.17, 0.14, 74, 34, 0.26);
    crackle(ctx, t, 0.06, rand(1800, 2600), 0.07);
    ping(ctx, t, 0.011, rand(620, 760), 0.9);
  },

  /** Press on something unavailable: a muffled, dead knock. */
  denied(): void {
    const ctx = ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    thud(ctx, t, 0.16, 70, 45, 0.12);
    crackle(ctx, t, 0.03, 700, 0.05);
  },
};

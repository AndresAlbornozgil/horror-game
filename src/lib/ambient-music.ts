/**
 * Generative horror ambience built with the Web Audio API, so there are no audio files
 * to license or ship. Three layers, all kept quiet:
 *  - sparse, slightly out-of-tune piano in A minor with a flattened second
 *  - a dying radio signal: static bed, drop-outs, tuning sweeps, distant blips
 *  - an irregular heartbeat that follows the same rhythm as the heart-monitor line
 * Browser only.
 */
import { audioEngine, rand } from "./audio-engine";
import { heartbeatRhythm } from "./heartbeat-rhythm";
import type { HeartbeatStep } from "./heartbeat-rhythm";

const MASTER_LEVEL = 0.42;
const REVERB_SEND_LEVEL = 0.9;
const FADE_IN_TIME_CONSTANT = 2.2;
const FADE_OUT_TIME_CONSTANT = 0.5;
const STOP_DELAY_MS = 3500;

// A2, A3, Bb3, C4, D4, E4, F4, A4, Bb4, C5, E5
const PIANO_NOTES = [45, 57, 58, 60, 62, 64, 65, 69, 70, 72, 76];
const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/** What is happening in the soundscape right now, so visuals can move with it. */
export type AmbientEvent =
  | { type: "heartbeat"; amp: number; premature: boolean }
  | { type: "static"; seconds: number }
  | { type: "sweep"; seconds: number }
  | { type: "blip"; seconds: number };

class AmbientMusic {
  private master: GainNode | null = null;
  private send: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private wetBus: GainNode | null = null;
  private pianoBus: GainNode | null = null;
  private bedSources: AudioScheduledSourceNode[] = [];
  private timers = new Set<number>();
  private stopTimer: number | null = null;
  private rhythm: Generator<HeartbeatStep, never, undefined> | null = null;
  private playing = false;
  private muted = false;
  private readonly listeners = new Set<(event: AmbientEvent) => void>();
  private analyser: AnalyserNode | null = null;
  private pianoAnalyser: AnalyserNode | null = null;
  private levelBuffer: Float32Array<ArrayBuffer> | null = null;
  private pianoBuffer: Float32Array<ArrayBuffer> | null = null;

  /** Creates and resumes the audio context. Must run inside a user gesture the first time. */
  prime(): void {
    audioEngine.prime();
  }

  play(): void {
    this.buildGraph();
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.playing) return;
    this.playing = true;
    if (this.bedSources.length === 0) this.startBeds();
    this.rhythm = heartbeatRhythm();
    this.scheduleHeartbeat();
    this.schedulePiano(2.5);
    this.scheduleSignalEvent(7);
    this.applyLevel(FADE_IN_TIME_CONSTANT);
  }

  fadeOut(): void {
    if (!this.playing) return;
    this.playing = false;
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers.clear();
    this.setLevel(0, FADE_OUT_TIME_CONSTANT);
    this.stopTimer = window.setTimeout(() => this.stopBeds(), STOP_DELAY_MS);
  }

  /** True while the soundscape is running (even when muted, since it keeps playing silently). */
  get isPlaying(): boolean {
    return this.playing;
  }

  /** Calls `listener` at the moment each heartbeat, piano note, and signal event sounds. */
  subscribe(listener: (event: AmbientEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Live loudness of the mix, roughly 0 to 0.2. Measured before the mute control. */
  level(): number {
    const analyser = this.analyser;
    if (!analyser || !this.playing) return 0;
    const buffer = (this.levelBuffer ??= new Float32Array(analyser.fftSize));
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (const value of buffer) sum += value * value;
    return Math.sqrt(sum / buffer.length);
  }

  /** Instantaneous peak of the piano alone, read straight from the audio graph. */
  pianoLevel(): number {
    const analyser = this.pianoAnalyser;
    if (!analyser || !this.playing) return 0;
    const buffer = (this.pianoBuffer ??= new Float32Array(analyser.fftSize));
    analyser.getFloatTimeDomainData(buffer);
    let peak = 0;
    for (const value of buffer) peak = Math.max(peak, Math.abs(value));
    return peak;
  }

  /** Seconds between audio being generated and being heard, so visuals can line up with it. */
  outputLatency(): number {
    const ctx = audioEngine.ctx;
    if (!ctx) return 0;
    return ctx.baseLatency + (ctx.outputLatency || 0);
  }

  private emitAt(time: number, event: AmbientEvent): void {
    window.setTimeout(
      () => this.listeners.forEach((listener) => listener(event)),
      Math.max(0, (time - this.ctx.currentTime) * 1000),
    );
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    audioEngine.muted = muted;
    if (this.playing) this.applyLevel(0.4);
  }

  private get ctx(): AudioContext {
    return audioEngine.ctx!;
  }

  private buildGraph(): void {
    if (this.master) return;
    const ctx = audioEngine.prime();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(audioEngine.out!);
    const send = ctx.createGain();
    send.gain.value = 0;
    send.connect(audioEngine.reverbSend!);

    const dryBus = ctx.createGain();
    dryBus.connect(master);
    const wetBus = ctx.createGain();
    wetBus.connect(master);
    wetBus.connect(send);
    const pianoBus = ctx.createGain();
    pianoBus.connect(wetBus);

    // Level meters, tapped before the master gain so they keep moving while muted.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    dryBus.connect(analyser);
    wetBus.connect(analyser);
    this.analyser = analyser;
    const pianoAnalyser = ctx.createAnalyser();
    pianoAnalyser.fftSize = 1024;
    pianoBus.connect(pianoAnalyser);
    this.pianoAnalyser = pianoAnalyser;

    Object.assign(this, { master, send, dryBus, wetBus, pianoBus });
  }

  private applyLevel(timeConstant: number): void {
    this.setLevel(this.muted ? 0 : MASTER_LEVEL, timeConstant);
  }

  private setLevel(value: number, timeConstant: number): void {
    const now = this.ctx.currentTime;
    this.master!.gain.setTargetAtTime(value, now, timeConstant);
    this.send!.gain.setTargetAtTime(value * REVERB_SEND_LEVEL, now, timeConstant);
  }

  private later(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, delayMs);
    this.timers.add(id);
  }

  // Continuous layers ---------------------------------------------------------------

  private startBeds(): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Low drone: A against B-flat, a semitone that never resolves.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 220;
    droneFilter.Q.value = 4;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.06;
    droneFilter.connect(droneGain).connect(this.dryBus!);
    for (const [frequency, detune] of [
      [55, -6],
      [58.27, 5],
      [36.71, 0],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = frequency < 40 ? "sine" : "sawtooth";
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(droneFilter);
      osc.start(now);
      this.bedSources.push(osc);
    }
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.045;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 90;
    breath.connect(breathDepth).connect(droneFilter.frequency);
    breath.start(now);
    this.bedSources.push(breath);

    // Dead-radio static bed with a slowly wandering level.
    const hiss = ctx.createBufferSource();
    hiss.buffer = audioEngine.noise;
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 2600;
    hissFilter.Q.value = 0.6;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.009;
    hiss.connect(hissFilter).connect(hissGain).connect(this.dryBus!);
    hiss.start(now);
    this.bedSources.push(hiss);
    const wander = ctx.createOscillator();
    wander.frequency.value = 0.11;
    const wanderDepth = ctx.createGain();
    wanderDepth.gain.value = 0.006;
    wander.connect(wanderDepth).connect(hissGain.gain);
    wander.start(now);
    this.bedSources.push(wander);
  }

  private stopBeds(): void {
    this.stopTimer = null;
    this.bedSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    });
    this.bedSources = [];
  }

  // Heartbeat -----------------------------------------------------------------------

  private scheduleHeartbeat(): void {
    const step = this.rhythm!.next().value;
    this.later(() => {
      if (!this.playing) return;
      this.beat(step);
      this.scheduleHeartbeat();
    }, step.gap * 1000);
  }

  private beat(step: HeartbeatStep): void {
    const t = this.ctx.currentTime + 0.03;
    this.emitAt(t, { type: "heartbeat", amp: step.amp, premature: step.premature });
    if (step.premature) {
      // An early, stumbling beat: one soft knock and a weak flutter.
      this.thump(t, 0.55 * step.amp, 62);
      this.thump(t + 0.13, 0.25, 55);
      return;
    }
    this.thump(t, step.amp, 72);
    this.thump(t + 0.3, step.amp * 0.62, 66);
  }

  private thump(time: number, level: number, startHz: number): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(startHz, time);
    osc.frequency.exponentialRampToValueAtTime(34, time + 0.16);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.2 * level, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
    osc.connect(filter).connect(gain).connect(this.dryBus!);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  // Piano ---------------------------------------------------------------------------

  private schedulePiano(initialDelaySeconds?: number): void {
    const delay = initialDelaySeconds ? initialDelaySeconds * 1000 : rand(5000, 11500);
    this.later(() => {
      if (!this.playing) return;
      this.playPhrase();
      this.schedulePiano();
    }, delay);
  }

  private playPhrase(): void {
    const roll = Math.random();
    const now = this.ctx.currentTime + 0.05;
    if (roll < 0.45) {
      this.pianoNote(midiToHz(pick(PIANO_NOTES)), rand(0.1, 0.16), now);
    } else if (roll < 0.7) {
      // Two notes falling away.
      const index = 3 + Math.floor(Math.random() * (PIANO_NOTES.length - 3));
      this.pianoNote(midiToHz(PIANO_NOTES[index]!), 0.13, now);
      this.pianoNote(midiToHz(PIANO_NOTES[index - 2]!), 0.1, now + rand(0.9, 1.5));
    } else if (roll < 0.85) {
      // A and B-flat struck together.
      this.pianoNote(midiToHz(57), 0.11, now);
      this.pianoNote(midiToHz(58), 0.1, now + 0.02);
    } else {
      // A deep note, then something far above answering.
      this.pianoNote(midiToHz(45), 0.17, now);
      this.pianoNote(midiToHz(76), 0.08, now + rand(2.2, 3.2));
    }
  }

  /** Soft, slightly flat piano tone: decaying partials, a hammer tick, and a slow pitch droop. */
  private pianoNote(frequency: number, velocity: number, time: number): void {
    const ctx = this.ctx;
    const duration = frequency > 400 ? 5 : 7.5;

    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1500 + velocity * 6000;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(velocity, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    tone.connect(envelope).connect(this.pianoBus!);

    const detune = rand(-20, 20);
    for (const [harmonic, level, decay] of [
      [1, 1, 1],
      [2, 0.42, 0.7],
      [3, 0.2, 0.5],
      [4, 0.09, 0.35],
      [6, 0.03, 0.2],
    ] as const) {
      const osc = ctx.createOscillator();
      const partialHz = frequency * harmonic * (1 + 0.0005 * harmonic * harmonic);
      osc.frequency.setValueAtTime(partialHz, time);
      osc.frequency.exponentialRampToValueAtTime(partialHz * 0.992, time + duration);
      osc.detune.value = detune;
      const partial = ctx.createGain();
      partial.gain.setValueAtTime(level, time);
      partial.gain.exponentialRampToValueAtTime(0.0001, time + duration * decay);
      osc.connect(partial).connect(tone);
      osc.start(time);
      osc.stop(time + duration + 0.1);
    }

    const hammer = ctx.createBufferSource();
    hammer.buffer = audioEngine.noise;
    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = "bandpass";
    hammerFilter.frequency.value = 900;
    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(velocity * 0.35, time);
    hammerGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    hammer.connect(hammerFilter).connect(hammerGain).connect(this.pianoBus!);
    hammer.start(time, rand(0, 4));
    hammer.stop(time + 0.06);
  }

  // Lost signal ---------------------------------------------------------------------

  private scheduleSignalEvent(initialDelaySeconds?: number): void {
    const delay = initialDelaySeconds ? initialDelaySeconds * 1000 : rand(9000, 20000);
    this.later(() => {
      if (!this.playing) return;
      const roll = Math.random();
      if (roll < 0.4) this.signalLoss();
      else if (roll < 0.7) this.tuningSweep();
      else this.blips();
      this.scheduleSignalEvent();
    }, delay);
  }

  /** The signal tears: static swells with crackle and the piano ducks underneath it. */
  private signalLoss(): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const length = rand(1.4, 2.6);

    const source = ctx.createBufferSource();
    source.buffer = audioEngine.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = rand(1800, 3800);
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.15);
    for (let t = 0.15; t < length; t += rand(0.04, 0.11)) {
      gain.gain.setValueAtTime(rand(0.006, 0.04), now + t);
    }
    gain.gain.linearRampToValueAtTime(0.0001, now + length + 0.6);
    source.connect(filter).connect(gain).connect(this.wetBus!);
    source.start(now, rand(0, 4));
    source.stop(now + length + 0.7);

    const duck = this.pianoBus!.gain;
    duck.setTargetAtTime(0.15, now, 0.08);
    duck.setTargetAtTime(1, now + length, 0.5);
    this.emitAt(now, { type: "static", seconds: length + 0.6 });
  }

  /** Someone searching the dial: a wavering tone rising through the band, then falling away. */
  private tuningSweep(): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(rand(300, 450), now);
    osc.frequency.exponentialRampToValueAtTime(rand(1200, 1700), now + 2.2);
    osc.frequency.exponentialRampToValueAtTime(rand(500, 700), now + 2.9);

    const tremolo = ctx.createOscillator();
    tremolo.frequency.value = rand(7, 12);
    const tremoloDepth = ctx.createGain();
    tremoloDepth.gain.value = 0.007;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.012, now + 1);
    gain.gain.linearRampToValueAtTime(0.0001, now + 3);
    tremolo.connect(tremoloDepth).connect(gain.gain);

    osc.connect(gain).connect(this.wetBus!);
    for (const source of [osc, tremolo]) {
      source.start(now);
      source.stop(now + 3.1);
    }
    this.emitAt(now, { type: "sweep", seconds: 3 });
  }

  /** Faint, distant beeps: a call that never gets answered. */
  private blips(): void {
    const ctx = this.ctx;
    const unit = 0.08;
    const frequency = pick([880, 1040, 740]);
    let cursor = ctx.currentTime + 0.05;
    for (const length of pick([[1, 1, 1], [3, 1], [1, 3, 1], [3, 3]])) {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      const gain = ctx.createGain();
      const duration = length * unit;
      gain.gain.setValueAtTime(0.0001, cursor);
      gain.gain.linearRampToValueAtTime(0.02, cursor + 0.01);
      gain.gain.setValueAtTime(0.02, cursor + duration);
      gain.gain.linearRampToValueAtTime(0.0001, cursor + duration + 0.02);
      osc.connect(gain).connect(this.wetBus!);
      osc.start(cursor);
      osc.stop(cursor + duration + 0.05);
      this.emitAt(cursor, { type: "blip", seconds: duration });
      cursor += duration + unit * 1.5;
    }
  }
}

export const ambientMusic = new AmbientMusic();

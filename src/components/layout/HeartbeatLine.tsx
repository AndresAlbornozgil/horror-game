"use client";

import { useEffect, useRef } from "react";
import { ambientMusic } from "@/lib/ambient-music";
import { heartbeatRhythm } from "@/lib/heartbeat-rhythm";

const WIDTH = 288;
const HEIGHT = 44;
const SAMPLES_PER_PX = 3;
const SAMPLE_COUNT = (WIDTH - 6) * SAMPLES_PER_PX;
const PAD = 3; // keeps the glowing head inside the canvas at both edges
const SCROLL_SPEED = 55; // px per second, drifts around this
const BEAT_DURATION = 0.5; // seconds
const PIANO_ATTACK_FLOOR = 0.12; // seconds the "baseline" piano level takes to catch up after a note starts
const TRAIL_FADE = 1.8; // higher = older trace dims faster behind the pen
const BEAT_GAIN = 0.3; // heartbeat bumps stay small; the line is mostly flat
const GAP_AHEAD = 20 * SAMPLES_PER_PX; // erased stretch just ahead of the pen
const BASELINE = HEIGHT * 0.5;
const SCALE = HEIGHT * 0.42;
const COLOR = "185, 45, 45";

interface Beat {
  time: number;
  amp: number;
  premature: boolean;
}

interface Reading {
  time: number;
  spike: number;
}

interface Disturbance {
  start: number;
  length: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const gauss = (u: number, mu: number, sigma: number) => Math.exp(-0.5 * ((u - mu) / sigma) ** 2);

/** Turns the piano's live level into a spike: sharp on each note's attack, gone within a fraction of a second. */
const spikeFromOnset = (onset: number) => 1.15 * (1 - Math.exp(-2.4 * (onset / 0.06)));

/** Normal PQRST complex, or a wide inverted premature beat. u runs 0..1 across the beat. */
function beatShape(u: number, premature: boolean): number {
  if (premature) return -0.9 * gauss(u, 0.4, 0.07) + 0.45 * gauss(u, 0.72, 0.09);
  return (
    0.12 * gauss(u, 0.15, 0.04) -
    0.15 * gauss(u, 0.31, 0.014) +
    1.0 * gauss(u, 0.355, 0.016) -
    0.32 * gauss(u, 0.4, 0.016) +
    0.25 * gauss(u, 0.68, 0.06)
  );
}

/**
 * Heart-monitor trace: a flat line that spikes exactly with the piano, read live from the audio.
 * Like a real ECG, a glowing pen sweeps left to right, endlessly, and wraps straight
 * back to the left edge; the older trace dims behind it and is wiped just ahead of it.
 */
export function HeartbeatLine({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const samples = new Float32Array(SAMPLE_COUNT).fill(BASELINE);

    const draw = (pen: number, uniform = false) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.lineWidth = 1.3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = `rgb(${COLOR})`;

      for (let i = 1; i < SAMPLE_COUNT; i++) {
        const age = (pen - i + SAMPLE_COUNT) % SAMPLE_COUNT;
        if (!uniform && (SAMPLE_COUNT - age < GAP_AHEAD || age === 0)) continue;
        const alpha = uniform ? 0.9 : 0.15 + 0.85 * Math.pow(1 - age / SAMPLE_COUNT, TRAIL_FADE);
        // Glow only the freshest part of the trace; stacked shadows turn the flatline into a thick bar.
        ctx.shadowBlur = !uniform && age < SAMPLE_COUNT * 0.2 && i % 3 === 0 ? 4 : 0;
        ctx.strokeStyle = `rgba(${COLOR}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(PAD + (i - 1) / SAMPLES_PER_PX, samples[i - 1]!);
        ctx.lineTo(PAD + i / SAMPLES_PER_PX, samples[i]!);
        ctx.stroke();
      }

      if (!uniform) {
        ctx.shadowBlur = 10;
        ctx.fillStyle = "rgb(240, 150, 150)";
        ctx.beginPath();
        ctx.arc(PAD + pen / SAMPLES_PER_PX, samples[pen]!, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const u = (i / SAMPLES_PER_PX - 110) / (BEAT_DURATION * SCROLL_SPEED);
        samples[i] = BASELINE - SCALE * (u >= 0 && u <= 1 ? beatShape(u, false) : 0);
      }
      draw(SAMPLE_COUNT - 1, true);
      return;
    }

    const director = heartbeatRhythm();
    const beats: Beat[] = [];
    const readings: Reading[] = [];
    const statics: Disturbance[] = [];
    const sweeps: Disturbance[] = [];
    const blips: Disturbance[] = [];

    let time = 0;
    let level = 0; // live loudness of the soundscape
    let latency = 0; // seconds between the audio graph and the speakers
    let pianoAverage = 0;
    let nextBeatTime = 0.8;
    let followingAudio = false;

    /** The latest piano spike that had reached the listener's ears by time `t`. */
    const spikeAt = (t: number): number => {
      for (let i = readings.length - 1; i >= 0; i--) {
        if (readings[i]!.time <= t) return readings[i]!.spike;
      }
      return 0;
    };

    const signalAt = (t: number): number => {
      // Mostly a flat line: only the faintest drift, a touch more as the sound gets louder.
      let value = (0.004 + level * 0.15) * Math.sin(t * 1.3) + (0.003 + level * 0.1) * rand(-1, 1);
      for (const beat of beats) {
        const u = (t - beat.time) / BEAT_DURATION;
        if (u >= 0 && u <= 1) value += BEAT_GAIN * beat.amp * beatShape(u, beat.premature);
      }
      // The piano spike, taken from the audio as it was playing at this instant (shifted by output latency).
      value += spikeAt(t);
      // Static, tuning and beeps only disturb the line slightly; the piano is what spikes it.
      for (const burst of statics) {
        const p = (t - burst.start) / burst.length;
        if (p < 0 || p > 1) continue;
        value += Math.sin(Math.PI * p) ** 0.7 * rand(-0.06, 0.06);
      }
      for (const sweep of sweeps) {
        const p = (t - sweep.start) / sweep.length;
        if (p < 0 || p > 1) continue;
        value += 0.04 * Math.sin(Math.PI * p) * Math.sin(2 * Math.PI * sweep.length * (1.2 * p + 2.2 * p * p));
      }
      for (const blip of blips) {
        if (t >= blip.start && t <= blip.start + blip.length) value += 0.1;
      }
      return BASELINE - SCALE * value;
    };

    let penFloat = 0;
    let pen = 0; // integer samples written since the start; the column is pen % SAMPLE_COUNT
    let last = performance.now();
    let frame = 0;

    // Beats, static, tuning and beeps are reported when they are generated; shift them to when they are heard.
    const stopListening = ambientMusic.subscribe((event) => {
      const heardAt = time + latency;
      switch (event.type) {
        case "heartbeat":
          beats.push({ time: heardAt, amp: event.amp, premature: event.premature });
          break;
        case "static":
          statics.push({ start: heardAt, length: event.seconds });
          break;
        case "sweep":
          sweeps.push({ start: heardAt, length: event.seconds });
          break;
        case "blip":
          blips.push({ start: heardAt, length: event.seconds });
          break;
      }
    });

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;

      // With the soundscape running, the beats come from it. Before that, the line keeps its own pulse.
      const audioPlaying = ambientMusic.isPlaying;
      if (audioPlaying !== followingAudio) {
        followingAudio = audioPlaying;
        if (!audioPlaying) nextBeatTime = time + 1.2;
      }
      level = audioPlaying ? ambientMusic.level() : 0;
      latency = Math.min(0.2, ambientMusic.outputLatency());
      if (!audioPlaying && time >= nextBeatTime) {
        const step = director.next().value;
        beats.push({ time: nextBeatTime, amp: step.amp, premature: step.premature });
        nextBeatTime += step.gap;
      }

      // Read the piano straight from the audio. Only the rise of each note counts, so every
      // note is a spike that lands exactly with its attack and the line is flat again right after.
      const peak = ambientMusic.pianoLevel();
      pianoAverage += (peak - pianoAverage) * (1 - Math.exp(-dt / PIANO_ATTACK_FLOOR));
      readings.push({ time: time + latency, spike: spikeFromOnset(Math.max(0, peak - pianoAverage)) });

      // The pen never moves at quite the same speed twice.
      const speed = SCROLL_SPEED * (1 + 0.15 * Math.sin(time * 0.4) + 0.08 * Math.sin(time * 1.1));
      const samplesPerSecond = speed * SAMPLES_PER_PX;
      penFloat += dt * samplesPerSecond;
      while (pen < Math.floor(penFloat)) {
        pen++;
        samples[pen % SAMPLE_COUNT] = signalAt(time - (penFloat - pen) / samplesPerSecond);
      }

      while (beats.length > 0 && time - beats[0]!.time > BEAT_DURATION) beats.shift();
      while (readings.length > 0 && time - readings[0]!.time > 1) readings.shift();
      for (const list of [statics, sweeps, blips]) {
        while (list.length > 0 && time - list[0]!.start > list[0]!.length) list.shift();
      }

      draw(pen % SAMPLE_COUNT);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      stopListening();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`block w-72 max-w-full ${className}`}
      style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    />
  );
}

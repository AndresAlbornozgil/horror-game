/**
 * Shared Web Audio plumbing for music and sound effects: one AudioContext, one output
 * chain (compressor), one reverb, one noise buffer. Browser only; the context is created
 * lazily inside a user gesture so autoplay policies are respected.
 */
class AudioEngine {
  ctx: AudioContext | null = null;
  /** Mix point feeding the master compressor. */
  out: GainNode | null = null;
  /** Anything connected here is sent through the reverb. */
  reverbSend: GainNode | null = null;
  noise: AudioBuffer | null = null;
  muted = false;

  /** Creates (first call) and resumes the context. Call it from a user-gesture handler. */
  prime(): AudioContext {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  private build(): void {
    const ctx = new AudioContext();

    const compressor = ctx.createDynamicsCompressor();
    compressor.connect(ctx.destination);
    const out = ctx.createGain();
    out.connect(compressor);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.createImpulse(ctx, 5.5, 2.3);
    const wet = ctx.createGain();
    wet.gain.value = 0.8;
    const reverbSend = ctx.createGain();
    reverbSend.connect(reverb);
    reverb.connect(wet).connect(out);

    this.ctx = ctx;
    this.out = out;
    this.reverbSend = reverbSend;
    this.noise = this.createNoise(ctx, 6);
  }

  private createImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  private createNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

export const audioEngine = new AudioEngine();

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The field's score.
 *
 * Synthesised in the browser rather than shipped as a file. Three reasons, in
 * order of weight: a third-party track on a public page is a licensing question
 * nobody asked, the catalog world's actual medium IS synthesis — pure sine
 * tones, sparse clicks, a noise floor — and generated audio costs zero bytes.
 *
 * The frequencies are not decorative. The drone's beat rate and the two LFOs
 * are the same temporal coefficients the wave shader steps its harmonics with
 * (0.55, 0.38, 0.24), so the thing you hear and the thing you see are running
 * off one set of numbers. The pings are tuned to the ratios between them.
 *
 * Nothing here starts on its own: the context is created on the first user
 * gesture and the master gain opens from silence.
 */

/** Shared with the vertex shader in wave-field.ts. One source of numbers. */
const HARMONIC_RATE = [0.55, 0.38, 0.24] as const;

const SUB_HZ = 48;
const PING_HZ = [1760, 2093.005, 2637.02, 3520, 4186.01] as const;

export interface AudioHandle {
  setEnabled(on: boolean): Promise<void>;
  setVolume(v: number): void;
  isEnabled(): boolean;
  observeField(amplitude: number): void;
  destroy(): void;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 4;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function createFieldAudio(): AudioHandle {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let pingBus: GainNode | null = null;
  let enabled = false;
  let volume = 0.55;
  let pingTimer: number | undefined;
  let amplitude = 4;
  const voices: Array<OscillatorNode | AudioBufferSourceNode> = [];

  /** 0..1 from the control maps to a deliberately low ceiling. */
  const gainFor = (v: number) => v * 0.3;

  function build() {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // ── Sub drone: two sines a fraction apart, so they beat slowly ──────────
    const subBus = ctx.createGain();
    subBus.gain.value = 0.5;
    subBus.connect(master);

    for (const detune of [0, HARMONIC_RATE[0] / 2]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = SUB_HZ + detune;
      osc.connect(subBus);
      osc.start();
      voices.push(osc);
    }

    // ── Mid tone, breathing on the shader's second rate ────────────────────
    const midGain = ctx.createGain();
    midGain.gain.value = 0.06;
    midGain.connect(master);

    const mid = ctx.createOscillator();
    mid.type = 'sine';
    mid.frequency.value = SUB_HZ * 4;
    mid.connect(midGain);
    mid.start();
    voices.push(mid);

    const midLfo = ctx.createOscillator();
    midLfo.type = 'sine';
    midLfo.frequency.value = HARMONIC_RATE[1] * 0.1;
    const midLfoDepth = ctx.createGain();
    midLfoDepth.gain.value = 0.045;
    midLfo.connect(midLfoDepth).connect(midGain.gain);
    midLfo.start();
    voices.push(midLfo);

    // ── Noise floor: the room the tones sit in ─────────────────────────────
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.4;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;

    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();
    voices.push(noise);

    // ── Ping bus ───────────────────────────────────────────────────────────
    pingBus = ctx.createGain();
    pingBus.gain.value = 0.16;
    pingBus.connect(master);

    return true;
  }

  function ping() {
    if (!ctx || !pingBus || !enabled) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = PING_HZ[Math.floor(Math.random() * PING_HZ.length)];

    // Short, hard attack and an exponential tail: a struck value, not a pad.
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(1, now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    osc.connect(env).connect(pingBus);
    osc.start(now);
    osc.stop(now + 1.6);

    schedulePing();
  }

  function schedulePing() {
    window.clearTimeout(pingTimer);
    // A busier field pings a little more often. amplitude runs roughly 0..6.
    const busy = Math.min(Math.max(amplitude / 6, 0), 1);
    const wait = 6500 - busy * 3200 + Math.random() * 2500;
    pingTimer = window.setTimeout(ping, wait);
  }

  return {
    async setEnabled(on: boolean) {
      if (on && !ctx && !build()) return;
      if (!ctx || !master) return;

      enabled = on;

      if (on) {
        // Autoplay policy: the context starts suspended until a gesture.
        if (ctx.state === 'suspended') await ctx.resume();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(gainFor(volume), ctx.currentTime + 1.4);
        schedulePing();
      } else {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        window.clearTimeout(pingTimer);
      }
    },

    setVolume(v: number) {
      volume = Math.min(Math.max(v, 0), 1);
      if (ctx && master && enabled) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(gainFor(volume), ctx.currentTime + 0.12);
      }
    },

    isEnabled: () => enabled,

    observeField(next: number) {
      amplitude = next;
    },

    destroy() {
      window.clearTimeout(pingTimer);
      for (const v of voices) {
        try {
          v.stop();
        } catch {
          /* already stopped */
        }
      }
      voices.length = 0;
      void ctx?.close();
      ctx = null;
    },
  };
}

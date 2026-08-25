/**
 * The field's score — a lo-fi loop, synthesised in the browser.
 *
 * WHY SYNTHESISED RATHER THAN A FILE. A third-party track on a public page is a
 * licensing question nobody asked, and one that cannot be answered by looking at
 * an mp3. Everything below is generated from oscillators and noise written here,
 * so the page owns its score outright: no attribution, no takedown surface, no
 * expiring "royalty-free" terms. It also costs zero bytes of audio payload — the
 * whole loop is a few kilobytes of code, fetched only when someone asks for it.
 *
 * WHAT IT PLAYS. Four bars at 72 BPM, ii–V–I–IV in F: Gm9 · C9 · Fmaj7 · Bb∆9.
 * Keys are a two-partial Rhodes (fundamental plus a fast-decaying tine an octave
 * up), the bass is a filtered sine, and the kit is three noise-and-sine voices.
 * The lo-fi character is not decoration — it is three specific processes: a
 * lowpass veil over the whole mix, tape wow from a slow detune LFO, and vinyl
 * crackle running underneath continuously.
 *
 * WHAT STILL TIES IT TO THE FIELD. `observeField` walks the veil's cutoff with
 * the mesh's measured amplitude, so a busier field is literally a brighter mix.
 * The audio and the visual keep running off one number, which was the point of
 * generating the score in the first place.
 *
 * Nothing here starts on its own: the context is created on the first user
 * gesture and the master gain opens from silence.
 */

const BPM = 72;
const BEAT = 60 / BPM;
/** Sixteenths. Four bars of sixteen steps is the whole loop. */
const STEP = BEAT / 4;
const STEPS = 64;
/** Late-swing on the off sixteenths. Straight sixteenths do not sound lo-fi. */
const SWING = 0.34;

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.15;

const mtof = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * One chord per bar. Voicings sit inside a single octave around middle C so the
 * changes move by voice-leading rather than by jumping the whole shape.
 */
const PROGRESSION = [
  { chord: [58, 62, 65, 69], bass: 43 }, // Gm9  — Bb D F A over G
  { chord: [60, 64, 67, 70], bass: 36 }, // C9   — C E G Bb over C
  { chord: [57, 60, 64, 65], bass: 41 }, // F∆7  — A C E F over F
  { chord: [57, 62, 65, 70], bass: 46 }, // Bb∆9 — A D F Bb over Bb
] as const;

/** Positions within a bar, in sixteenths. The keys land off the beat on 6. */
const KEYS_ON = [0, 6];
const BASS_ON = [0, 10];
const KICK_ON = [0, 10];
const SNARE_ON = [4, 12];
const HAT_ON = [0, 2, 4, 6, 8, 10, 12, 14];

/** The veil. A busy field opens it; a still one closes it back down. */
const VEIL_MIN = 1500;
const VEIL_MAX = 3400;

export interface AudioHandle {
  setEnabled(on: boolean): Promise<void>;
  setVolume(v: number): void;
  isEnabled(): boolean;
  observeField(amplitude: number): void;
  destroy(): void;
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Vinyl surface noise: mostly silence with sparse impulses of random polarity.
 * White noise alone sounds like a broken tweeter; crackle is an impulse train.
 */
function crackleBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // Sparse and soft. Both numbers were pulled down after the first pass read
    // as surface damage rather than surface: crackle is meant to be the room
    // the music sits in, and a room you can hear over the music is a mix fault.
    data[i] = Math.random() < 0.00045 ? (Math.random() * 2 - 1) * 0.45 : 0;
  }
  return buf;
}

/** Gentle odd-harmonic saturation. Tape colour, not distortion. */
function tapeCurve(): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
  }
  return curve;
}

/**
 * @param onState Called whenever the score's audibility changes on its own —
 *   which happens when the browser suspends the context and we cannot get it
 *   back without another gesture. The control has to hear about it, or it goes
 *   on printing "playing" over silence.
 */
export function createFieldAudio(onState?: (playing: boolean) => void): AudioHandle {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let veil: BiquadFilterNode | null = null;
  let keysBus: GainNode | null = null;
  let bassBus: GainNode | null = null;
  let drumBus: GainNode | null = null;
  /** The wow modulator's output, kept so each new key voice can subscribe. */
  let wowBus: GainNode | null = null;

  let enabled = false;
  let volume = 0.55;
  let amplitude = 4;

  let clock: number | undefined;
  let step = 0;
  let nextStepTime = 0;

  const sustained: Array<OscillatorNode | AudioBufferSourceNode> = [];

  /** 0..1 from the control maps to a deliberately low ceiling. */
  const gainFor = (v: number) => v * 0.32;

  function build() {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();

    master = ctx.createGain();
    master.gain.value = 0;

    // ── The veil: everything above it is what "lo-fi" removes ───────────────
    veil = ctx.createBiquadFilter();
    veil.type = 'lowpass';
    veil.frequency.value = 2400;
    veil.Q.value = 0.6;

    const tape = ctx.createWaveShaper();
    tape.curve = tapeCurve();
    tape.oversample = '2x';

    veil.connect(tape).connect(master).connect(ctx.destination);

    keysBus = ctx.createGain();
    keysBus.gain.value = 0.16;
    keysBus.connect(veil);

    bassBus = ctx.createGain();
    bassBus.gain.value = 0.5;
    bassBus.connect(veil);

    drumBus = ctx.createGain();
    drumBus.gain.value = 0.34;
    drumBus.connect(veil);

    // ── Tape wow: a slow, shallow pitch drift across the keys ───────────────
    const wow = ctx.createOscillator();
    wow.type = 'sine';
    wow.frequency.value = 0.24;
    const wowDepth = ctx.createGain();
    wowDepth.gain.value = 7; // cents
    wow.connect(wowDepth);
    wow.start();
    sustained.push(wow);
    wowBus = wowDepth;

    // ── Vinyl crackle and room hiss, both continuous ────────────────────────
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer(ctx, 6);
    crackle.loop = true;
    const crackleShelf = ctx.createBiquadFilter();
    crackleShelf.type = 'highpass';
    crackleShelf.frequency.value = 1400;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.13;
    // Through the VEIL, not straight to master. Sending surface noise past the
    // lowpass is what made it sit on top of the music instead of under it —
    // real lo-fi crackle lives behind the same tape filter everything else does.
    crackle.connect(crackleShelf).connect(crackleGain).connect(veil);
    crackle.start();
    sustained.push(crackle);

    const hiss = ctx.createBufferSource();
    hiss.buffer = noiseBuffer(ctx, 4);
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 4200;
    hissFilter.Q.value = 0.5;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.004;
    hiss.connect(hissFilter).connect(hissGain).connect(veil);
    hiss.start();
    sustained.push(hiss);

    return true;
  }

  // ── Voices ─────────────────────────────────────────────────────────────────

  /** Rhodes: a fundamental that blooms and a tine that pings and leaves. */
  function key(freq: number, at: number, level: number) {
    if (!ctx || !keysBus) return;

    for (const [ratio, gain, decay] of [
      [1, 1, 3.4],
      [2, 0.34, 0.9],
      [4.02, 0.08, 0.32],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      if (wowBus) wowBus.connect(osc.detune);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(level * gain, at + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, at + decay);

      osc.connect(env).connect(keysBus);
      osc.start(at);
      osc.stop(at + decay + 0.05);
    }
  }

  function bass(freq: number, at: number) {
    if (!ctx || !bassBus) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.5, at + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);

    osc.connect(env).connect(bassBus);
    osc.start(at);
    osc.stop(at + 1.2);
  }

  function kick(at: number) {
    if (!ctx || !drumBus) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // The pitch drop IS the kick; a fixed low sine is just a thud.
    osc.frequency.setValueAtTime(118, at);
    osc.frequency.exponentialRampToValueAtTime(44, at + 0.085);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.9, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);

    osc.connect(env).connect(drumBus);
    osc.start(at);
    osc.stop(at + 0.45);
  }

  function snare(at: number) {
    if (!ctx || !drumBus) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.3);

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1750;
    band.Q.value = 0.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.28, at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);

    src.connect(band).connect(env).connect(drumBus);
    src.start(at);
    src.stop(at + 0.2);
  }

  function hat(at: number, level: number) {
    if (!ctx || !drumBus) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.12);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    // Thinner than the first pass. A hat is a noise burst, so the wider it is
    // the more it reads as hiss with a rhythm rather than as a cymbal.
    hp.frequency.value = 7600;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.055);

    src.connect(hp).connect(env).connect(drumBus);
    src.start(at);
    src.stop(at + 0.08);
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  function schedule(index: number, at: number) {
    const bar = PROGRESSION[Math.floor(index / 16) % PROGRESSION.length];
    const inBar = index % 16;

    if (KEYS_ON.includes(inBar)) {
      const level = inBar === 0 ? 0.5 : 0.3;
      // Roll the voicing rather than striking it flat — a hand, not a trigger.
      bar.chord.forEach((note, i) => key(mtof(note), at + i * 0.016, level));
    }

    if (BASS_ON.includes(inBar)) bass(mtof(bar.bass), at);
    if (KICK_ON.includes(inBar)) kick(at);
    if (SNARE_ON.includes(inBar)) snare(at);
    if (HAT_ON.includes(inBar)) hat(at, inBar % 4 === 0 ? 0.055 : 0.028);
  }

  /** Put the transport back on the downbeat, starting a beat from now. */
  function resync() {
    if (!ctx) return;
    step = 0;
    nextStepTime = ctx.currentTime + 0.12;
  }

  function tick() {
    if (!ctx || !enabled) return;

    // If the clock fell behind, do NOT let the loop catch up. A hidden tab
    // throttles `setInterval` to about once a minute while the context keeps
    // advancing, so on the next firing every missed sixteenth would be
    // scheduled at a time already in the past and fire at once — a minute of
    // the loop arriving as a single burst. Drop the gap and restart the bar.
    if (nextStepTime < ctx.currentTime) resync();

    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      // Odd sixteenths land late. This is the swing, and it is the difference
      // between a lo-fi loop and a drum machine demo.
      const swung = step % 2 === 1 ? nextStepTime + STEP * SWING : nextStepTime;
      schedule(step, swung);
      step = (step + 1) % STEPS;
      nextStepTime += STEP;
    }
  }

  /**
   * Coming back to the tab.
   *
   * Mobile browsers suspend an AudioContext when the page goes to the
   * background, and iOS also suspends it on any system interruption — a call,
   * another app taking the audio session. Neither fires an event on the way
   * out, so without this the score is simply dead on return while the control
   * still says it is playing.
   *
   * `resume()` is attempted, but it is not guaranteed: after some interruptions
   * iOS will only resume inside a user gesture. When it refuses, the honest
   * move is to hand the control back its OFF state — then the visitor's next
   * tap is the gesture, and it works.
   */
  async function onVisibility() {
    if (document.hidden || !enabled || !ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* Refused; handled below like any other failure to come back. */
      }
    }

    if (ctx.state === 'running') {
      resync();
      return;
    }

    enabled = false;
    window.clearInterval(clock);
    onState?.(false);
  }

  document.addEventListener('visibilitychange', onVisibility);

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
        master.gain.linearRampToValueAtTime(gainFor(volume), ctx.currentTime + 1.6);

        // Start on the downbeat of the loop, not wherever the last stop landed.
        resync();
        window.clearInterval(clock);
        clock = window.setInterval(tick, LOOKAHEAD_MS);
        tick();
      } else {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        window.clearInterval(clock);
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
      if (!ctx || !veil || !enabled) return;
      // amplitude runs roughly 0..6. The veil follows it slowly enough to read
      // as the mix breathing rather than as a filter being swept.
      const busy = Math.min(Math.max(amplitude / 6, 0), 1);
      veil.frequency.setTargetAtTime(
        VEIL_MIN + busy * (VEIL_MAX - VEIL_MIN),
        ctx.currentTime,
        1.5
      );
    },

    destroy() {
      window.clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const voice of sustained) {
        try {
          voice.stop();
        } catch {
          /* already stopped */
        }
      }
      sustained.length = 0;
      void ctx?.close();
      ctx = null;
    },
  };
}

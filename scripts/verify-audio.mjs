/**
 * The score is a claim like any other, so it gets exercised rather than trusted.
 *
 * An analyser is spliced in front of the real destination at page load, so what
 * is measured is the mix a visitor would hear — not the shape of a graph that
 * may or may not be making sound.
 *
 * The interesting number is the FLOOR, not the peak. Vinyl crackle and tape
 * hiss are supposed to be the room the music sits in; when they creep up they
 * do not change the peak at all, they raise the quiet parts, and the loop starts
 * reading as noisy without any single element being loud. The quietest frames
 * are where that shows.
 */
import { chromium, devices } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:4321';

// The boot screen covers the page until the field is up. Everything below acts
// on the landing, so wait for the cover to be gone rather than racing it.
const awaitBoot = (p) =>
  p.waitForFunction(() => !document.documentElement.hasAttribute('data-booting'), {
    timeout: 20000,
  });


const browser = await chromium.launch({
  channel: 'msedge',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.addInitScript(() => {
  const Real = window.AudioContext;
  window.AudioContext = function (...args) {
    const c = new Real(...args);
    const an = c.createAnalyser();
    an.fftSize = 2048;
    an.connect(Object.getPrototypeOf(c).__lookupGetter__('destination').call(c));
    // An own property shadows the prototype getter, so the page's graph lands
    // in the analyser and the analyser alone reaches the speakers.
    Object.defineProperty(c, 'destination', { get: () => an, configurable: true });
    window.__an = an;
    window.__ctx = c;
    // The kit once minted a fresh noise buffer per snare and per hat — about
    // 370 MB of Float32 an hour, invisible to `performance.memory` because an
    // AudioBuffer lives on the audio thread. Count them: a page left open is
    // where that bill comes due, and nothing else here would notice.
    window.__buffers = 0;
    const realCreate = c.createBuffer.bind(c);
    c.createBuffer = (...b) => { window.__buffers++; return realCreate(...b); };
    return c;
  };
  window.AudioContext.prototype = Real.prototype;
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await awaitBoot(page);
await page.waitForFunction(
  () => document.querySelector('[data-meter-nodes]')?.textContent?.trim() !== '–',
  { timeout: 15000 }
);

await page.click('[data-sound]');
// Past the 1.6s open ramp, so the ramp itself is not sampled as dynamics.
await page.waitForTimeout(2600);

// Everything the graph needs is built by now; steady-state must allocate nothing.
const buffersAtSteadyState = await page.evaluate(() => window.__buffers);

const mix = await page.evaluate(async () => {
  const an = window.__an;
  if (!an) return { error: 'analyser never installed' };
  const buf = new Float32Array(an.fftSize);
  const samples = [];
  // Two full loops at 72 BPM is a shade over 26s; 200 frames at 70ms covers a
  // whole loop, so every bar of the progression is represented.
  for (let i = 0; i < 200; i++) {
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    samples.push(Math.sqrt(sum / buf.length));
    await new Promise((r) => setTimeout(r, 70));
  }
  samples.sort((a, b) => a - b);
  const at = (q) => samples[Math.floor((samples.length - 1) * q)];
  return {
    state: window.__ctx.state,
    floor: at(0.05),
    median: at(0.5),
    peak: samples[samples.length - 1],
    frames: samples.length,
  };
});

const buffersAfterPlaying = await page.evaluate(() => window.__buffers);

// The off state must actually go quiet, not merely stop scheduling.
await page.click('[data-sound]');
await page.waitForTimeout(1600);
const off = await page.evaluate(() => {
  const buf = new Float32Array(window.__an.fftSize);
  window.__an.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  return Math.sqrt(sum / buf.length);
});

await ctx.close();

/**
 * Coming back to the page, on a touch device.
 *
 * Mobile browsers suspend an AudioContext when the page backgrounds, and iOS
 * suspends it on any system interruption too. Neither announces itself, so a
 * score with no recovery path is simply dead on return — while the control goes
 * on printing "playing" over silence, which is the failure this page has a
 * written rule against.
 *
 * Two outcomes are acceptable and both are checked: it comes back audible, or
 * the control honestly reads OFF so the visitor's next tap is the gesture that
 * fixes it. What is not acceptable is silence behind a control claiming sound.
 */
const instrument = () => {
  const Real = window.AudioContext;
  const Wrapped = function (...args) {
    const c = new Real(...args);
    const an = c.createAnalyser();
    an.fftSize = 2048;
    an.connect(Object.getPrototypeOf(c).__lookupGetter__('destination').call(c));
    Object.defineProperty(c, 'destination', { get: () => an, configurable: true });
    window.__an = an;
    window.__ctx = c;
    // Lets the test make `resume()` refuse, the way iOS does outside a gesture.
    window.__block = false;
    const realResume = c.resume.bind(c);
    c.resume = () => (window.__block ? Promise.reject(new Error('not allowed')) : realResume());
    return c;
  };
  Wrapped.prototype = Real.prototype;
  window.AudioContext = Wrapped;
};

const readControl = (page) =>
  page.evaluate(() => ({
    pressed: document.querySelector('[data-sound]')?.getAttribute('aria-pressed'),
    state: document.querySelector('[data-sound-state]')?.textContent?.trim(),
    icon: [...document.querySelectorAll('[data-sound] svg')]
      .filter((s) => s.getBoundingClientRect().width > 0)
      .map((s) => s.dataset.icon)[0],
    ctxState: window.__ctx?.state,
  }));

const peakOver = (page, frames) =>
  page.evaluate(async (n) => {
    const b = new Float32Array(window.__an.fftSize);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      window.__an.getFloatTimeDomainData(b);
      let s = 0;
      for (const v of b) s += v * v;
      peak = Math.max(peak, Math.sqrt(s / b.length));
      await new Promise((r) => setTimeout(r, 40));
    }
    return peak;
  }, frames);

const mobile = await browser.newContext({ ...devices['Pixel 5'] });
const mob = await mobile.newPage();
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.addInitScript(instrument);
await mob.goto(BASE, { waitUntil: 'networkidle' });
await awaitBoot(mob);
await mob.locator('[data-sound]').tap();
await mob.waitForTimeout(2600);

// Background it by fronting another page in the same context, then return.
const decoy = await mobile.newPage();
await decoy.goto('about:blank');
await mob.waitForTimeout(4000);
await mob.bringToFront();
await mob.waitForTimeout(2600);

const resumed = { peak: await peakOver(mob, 30), ...(await readControl(mob)) };

// Now make resume() refuse, the way iOS does after an interruption.
await mob.evaluate(async () => {
  window.__block = true;
  await window.__ctx.suspend();
});
await mob.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await mob.waitForTimeout(900);
const refused = await readControl(mob);

await mobile.close();
await browser.close();

const checks = {
  'the loop actually plays': !mix.error && mix.peak > 0.01,
  'it has dynamics rather than a wash': mix.peak > mix.median * 1.8,
  // The floor is the noise bed. Above roughly a fifth of the median it stops
  // being a bed and starts being a layer.
  'the noise bed sits under the music': mix.floor < mix.median * 0.35,
  'it stops on demand': off < 0.002,
  // Fourteen seconds of loop, and not one new buffer.
  'playing allocates no audio buffers': buffersAfterPlaying === buffersAtSteadyState,
  // Either audible again, or honestly OFF. Never silence behind a lit control.
  'it comes back after the tab is backgrounded, or admits it did not':
    (resumed.peak > 0.01 && resumed.pressed === 'true') ||
    (resumed.peak < 0.002 && resumed.pressed === 'false'),
  'a context that refuses to resume flips the control to OFF':
    refused.ctxState === 'suspended' &&
    refused.pressed === 'false' &&
    refused.icon === 'material-symbols:volume-off-sharp',
  'console clean': errors.length === 0,
};

console.log(
  JSON.stringify(
    {
      ...mix,
      floorOverMedian: (mix.floor / mix.median).toFixed(3),
      peakOverMedian: (mix.peak / mix.median).toFixed(3),
      rmsAfterOff: off,
      buffersWhilePlaying: buffersAfterPlaying - buffersAtSteadyState,
      afterBackgrounding: resumed,
      afterRefusedResume: refused,
      errors,
    },
    null,
    2
  )
);

let failed = 0;
for (const [name, pass] of Object.entries(checks)) {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
}
console.log(`\n${Object.keys(checks).length - failed}/${Object.keys(checks).length} passed`);
process.exit(failed ? 1 : 0);

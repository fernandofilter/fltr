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
import { chromium } from 'playwright-core';

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

await browser.close();

const checks = {
  'the loop actually plays': !mix.error && mix.peak > 0.01,
  'it has dynamics rather than a wash': mix.peak > mix.median * 1.8,
  // The floor is the noise bed. Above roughly a fifth of the median it stops
  // being a bed and starts being a layer.
  'the noise bed sits under the music': mix.floor < mix.median * 0.35,
  'it stops on demand': off < 0.002,
  'console clean': errors.length === 0,
};

console.log(
  JSON.stringify(
    {
      ...mix,
      floorOverMedian: (mix.floor / mix.median).toFixed(3),
      peakOverMedian: (mix.peak / mix.median).toFixed(3),
      rmsAfterOff: off,
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

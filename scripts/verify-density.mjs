/**
 * The density control.
 *
 * Before this, the mesh's point count came from viewport WIDTH alone — a guess
 * about the screen standing in for a fact about the machine. A ten-year-old
 * laptop on a wide monitor got the same fifty thousand points as a new one, and
 * nothing measured whether it could hold them.
 *
 * Three claims, and the third is the one that matters on a slow machine:
 *
 *  1. The control moves the mesh, and the foot rail's NODES meter — which the
 *     page already printed — is the readout. The number becomes something the
 *     visitor moves rather than reads.
 *  2. The choice persists and survives a reload.
 *  3. The field measures its own frame time once and steps down when it cannot
 *     keep up — but never overrules a visitor who already chose.
 *
 * NOTE ON THE LOAD. CPU throttling is not used here and would prove nothing:
 * this field is GPU-bound, and Chrome's throttle does not touch the GPU. It
 * reported the same 13ms at 1x and at 6x. Real main-thread work per frame is
 * what a weak machine actually has, so that is what this injects.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:4321';

const awaitBoot = (p) =>
  p.waitForFunction(() => !document.documentElement.hasAttribute('data-booting'), {
    timeout: 25000,
  });

const browser = await chromium.launch({ channel: 'msedge' });
const results = [];

const read = (page) =>
  page.evaluate(() => ({
    nodes: document.querySelector('[data-meter-nodes]')?.textContent,
    step: document.querySelector('[data-density]')?.value,
    // Screen readers must hear the step's name, not its index.
    valueText: document.querySelector('[data-density]')?.getAttribute('aria-valuetext'),
    stored: (() => {
      try {
        return localStorage.getItem('fltr-density');
      } catch {
        return null;
      }
    })(),
  }));

const setStep = async (page, step) => {
  await page.evaluate((s) => {
    const el = document.querySelector('[data-density]');
    el.value = String(s);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, step);
  await page.waitForTimeout(600);
};

// ── 1. The control moves the mesh, and the rail reports it ─────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await awaitBoot(page);
  await page.waitForTimeout(2000);

  const initial = await read(page);
  const seen = [];
  for (const step of [0, 1, 2, 3]) {
    await setStep(page, step);
    seen.push(await read(page));
  }

  const counts = seen.map((s) => Number(s.nodes.replace(/\D/g, '')));
  results.push({
    check: 'each step rebuilds the mesh, and the NODES meter is the readout',
    initialValueText: initial.valueText,
    steps: seen.map((s, i) => `${s.valueText}: ${counts[i].toLocaleString('en-US')}`),
    errors,
    pass:
      errors.length === 0 &&
      // Painted before anyone touches it, or a screen reader announces "2".
      initial.valueText === 'High' &&
      // Strictly increasing, and a real spread rather than a token nudge.
      counts.every((n, i) => i === 0 || n > counts[i - 1]) &&
      counts[3] > counts[0] * 4 &&
      seen.map((s) => s.valueText).join() === 'Low,Medium,High,Max',
  });

  // ── 2. It persists ───────────────────────────────────────────────────────
  await setStep(page, 0);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await awaitBoot(page);
  // Well past the field's own measurement window, so this also proves the
  // measurement does not overrule a stored choice.
  await page.waitForTimeout(9000);
  const after = await read(page);

  results.push({
    check: 'the choice survives a reload, and the measurement does not overrule it',
    ...after,
    pass: after.step === '0' && after.stored === '0' && Number(after.nodes.replace(/\D/g, '')) < 15000,
  });
  await ctx.close();
}

// ── 3. A machine that cannot keep up gets stepped down ─────────────────────
for (const [label, blockMs, expected] of [
  ['an idle machine keeps every point', 0, 'High'],
  ['24ms of work per frame drops one step', 24, 'Medium'],
  ['40ms of work per frame drops two', 40, 'Low'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const suggestions = [];
  await page.exposeFunction('__perf', (m, s) => suggestions.push({ medianMs: Math.round(m), step: s }));
  await page.addInitScript((ms) => {
    document.addEventListener('fltr:density-suggest', (e) =>
      window.__perf(e.detail.medianMs, e.detail.step)
    );
    if (ms > 0) {
      const burn = () => {
        const end = performance.now() + ms;
        while (performance.now() < end) {
          /* the work a slow machine is already doing */
        }
        requestAnimationFrame(burn);
      };
      requestAnimationFrame(burn);
    }
  }, blockMs);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await awaitBoot(page);
  await page.waitForTimeout(12000);
  const r = await read(page);

  results.push({
    check: label,
    measured: suggestions,
    landedOn: r.valueText,
    nodes: r.nodes,
    pass: r.valueText === expected && suggestions.length === 1,
  });
  await ctx.close();
}

await browser.close();

let failed = 0;
for (const r of results) {
  const { check, pass, ...rest } = r;
  if (!pass) failed++;
  console.log(`\n${pass ? 'PASS' : 'FAIL'}  ${check}`);
  console.log(JSON.stringify(rest, null, 2));
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

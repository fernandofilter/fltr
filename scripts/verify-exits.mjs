/**
 * The two mandatory exits, tested rather than asserted.
 *
 * A high-contrast field in continuous motion is a photosensitivity risk, so
 * "reduced motion freezes it" and "no WebGL still gives a page" are safety
 * claims. Claims like that get verified.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const browser = await chromium.launch({ channel: 'msedge' });
const results = [];

// ── 1. prefers-reduced-motion: the field resolves once and holds ────────────
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  const first = await page.evaluate(
    () => document.querySelector('[data-meter-frame]')?.textContent
  );
  await page.waitForTimeout(1800);
  const second = await page.evaluate(
    () => document.querySelector('[data-meter-frame]')?.textContent
  );
  const amp = await page.evaluate(
    () => document.querySelector('[data-meter-amp]')?.textContent
  );

  results.push({
    check: 'prefers-reduced-motion holds the field',
    frameFirst: first,
    frameSecond: second,
    amplitude: amp,
    // Held means the frame index stops advancing, and amplitude is non-zero:
    // the mesh is fully resolved, just not moving.
    pass: first === second && amp !== null && parseFloat(amp) > 0,
  });
  await ctx.close();
}

// ── 2. No WebGL: the page still ships, with the still bar field ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    // Deny every WebGL context so the renderer constructor throws.
    HTMLCanvasElement.prototype.getContext = function () {
      return null;
    };
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  const state = await page.evaluate(() => ({
    webglFlag: document.querySelector('[data-field]')?.getAttribute('data-webgl'),
    fallbackVisible: !document.querySelector('[data-field-fallback]')?.hasAttribute('hidden'),
    wordmarkVisible: Boolean(document.querySelector('.wordmark svg')?.getBoundingClientRect().width),
    motionHidden: document.querySelector('[data-motion]')?.hidden ?? null,
  }));

  await page.screenshot({ path: '.impeccable/review/no-webgl.png' });

  results.push({
    check: 'no WebGL still ships a page',
    ...state,
    // The motion control must disappear: a stop button for motion that cannot
    // happen is a control that lies.
    pass:
      state.webglFlag === 'off' &&
      state.fallbackVisible &&
      state.wordmarkVisible &&
      state.motionHidden === true,
  });
  await ctx.close();
}

// ── 3. The motion control actually stops the field ─────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelector('[data-meter-nodes]')?.textContent?.trim() !== '–',
    { timeout: 15000 }
  );
  await page.waitForTimeout(1800);

  await page.click('[data-motion]');
  await page.waitForTimeout(300);
  const a = await page.evaluate(() => document.querySelector('[data-meter-frame]')?.textContent);
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => document.querySelector('[data-meter-frame]')?.textContent);
  const pressed = await page.getAttribute('[data-motion]', 'aria-pressed');
  const labelAfter = await page.textContent('[data-motion-text]');

  results.push({
    check: 'stop control halts the field',
    frameAfterStop: a,
    frameLater: b,
    ariaPressed: pressed,
    labelAfter: labelAfter?.trim(),
    pass: a === b && pressed === 'true',
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

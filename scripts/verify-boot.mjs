/**
 * The boot screen makes four claims, and three of them fail silently.
 *
 *  1. It covers before first paint. A cover that arrives a frame late is a
 *     flash of the page it exists to hide.
 *  2. Its stages are MEASURED. This page's standing rule is that printed
 *     numbers are sampled from the thing on screen; a fabricated progress bar
 *     would be the one lie on it. The values are checked against the page's own
 *     independent readouts.
 *  3. It hands off the entrance. The mesh must still be flat while covered and
 *     resolve after — otherwise the page's single authored beat is spent behind
 *     a curtain and nobody sees it.
 *  4. It always leaves. No WebGL, and a boot that never reports, both still
 *     end with a landing rather than a trap.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const OUT = '.impeccable/review';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const results = [];

const gone = (page) =>
  page.waitForFunction(() => !document.documentElement.hasAttribute('data-booting'), {
    timeout: 20000,
  });

// ── 1. It is up before the page paints, and it covers ──────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  const early = await page.evaluate(() => {
    const boot = document.querySelector('[data-boot]');
    const box = boot?.getBoundingClientRect();
    return {
      flag: document.documentElement.dataset.booting,
      covers: Boolean(box && box.width >= window.innerWidth && box.height >= window.innerHeight),
      // Nothing behind it may be reachable by keyboard while it is up.
      shellInert: document.querySelector('.shell')?.hasAttribute('inert') ?? null,
    };
  });

  await page.waitForTimeout(260);
  await page.screenshot({ path: `${OUT}/boot.png` });

  results.push({
    check: 'the cover is up at parse time, full-bleed, and the page behind it is inert',
    ...early,
    pass: early.flag === '' && early.covers === true && early.shellInert === true,
  });
  await ctx.close();
}

// ── 2. The stages are measured, not invented ───────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  // Read the log at the last moment it is still on screen.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-boot-row]:not([data-pending])').length === 4,
    { timeout: 20000 }
  );
  const log = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-boot-row]')].map((r) => [
        r.dataset.bootRow,
        r.querySelector('[data-boot-value]')?.textContent?.trim(),
      ])
    )
  );

  await gone(page);
  await page.waitForTimeout(1600);

  // The page's own meter counts the same nodes, by a path the boot never took.
  const meterNodes = await page.evaluate(
    () => document.querySelector('[data-meter-nodes]')?.textContent?.trim()
  );

  results.push({
    check: 'every stage reports a measured value, and MESH agrees with the rail meter',
    log,
    meterNodes,
    pass:
      /^\d+$/.test(log.face ?? '') &&
      /^WebGL2?$/.test(log.renderer ?? '') &&
      log.mesh === meterNodes &&
      /^\d+ ms$/.test(log.frame ?? ''),
  });
  await ctx.close();
}

// ── 3. The entrance is held under the cover and released with it ────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  // Amplitude is `peak * uProgress`, so it is exactly zero while the entrance
  // is held and non-zero once it plays. The rail meter reads it for free.
  await page.waitForFunction(
    () => document.querySelector('[data-meter-nodes]')?.textContent?.trim() !== '–',
    { timeout: 20000 }
  );
  const whileCovered = await page.evaluate(() => ({
    booting: document.documentElement.hasAttribute('data-booting'),
    amplitude: document.querySelector('[data-meter-amp]')?.textContent?.trim(),
  }));

  await gone(page);
  await page.waitForTimeout(1800);
  const afterReveal = await page.evaluate(
    () => document.querySelector('[data-meter-amp]')?.textContent?.trim()
  );

  results.push({
    check: 'the mesh stays flat under the cover and resolves once it lifts',
    whileCovered,
    afterReveal,
    pass:
      whileCovered.booting === true &&
      parseFloat(whileCovered.amplitude) === 0 &&
      parseFloat(afterReveal) > 1,
  });
  await ctx.close();
}

// ── 4. It leaves on the degraded path too ──────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = function () {
      return null;
    };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await gone(page);
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => ({
    bootPainted: Boolean(document.querySelector('[data-boot]')?.getBoundingClientRect().height),
    shellInert: document.querySelector('.shell')?.hasAttribute('inert') ?? null,
    wordmarkVisible: Boolean(
      document.querySelector('.wordmark svg')?.getBoundingClientRect().width
    ),
  }));

  results.push({
    check: 'no WebGL still ends in a landing, with the page handed back',
    ...state,
    pass:
      state.bootPainted === false && state.shellInert === false && state.wordmarkVisible === true,
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

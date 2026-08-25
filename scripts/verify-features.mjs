/**
 * Functional checks for the lens, the ticker and the score.
 * Each one is a claim; each one gets exercised rather than eyeballed.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const OUT = '.impeccable/review';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  // Let the page make sound without a real user gesture gate.
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const results = [];

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(
  () => document.querySelector('[data-meter-nodes]')?.textContent?.trim() !== '–',
  { timeout: 15000 }
);
await page.waitForTimeout(2200);

// ── 1. The lens ────────────────────────────────────────────────────────────
{
  const box = await page.locator('[data-wordmark]').boundingBox();
  const closed = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-wordmark]')).getPropertyValue('--lens-r').trim()
  );

  // Park the pointer over the middle of the mark and let the radius ease open.
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5);
  await page.waitForTimeout(700);

  const open = await page.evaluate(() => {
    const el = document.querySelector('[data-wordmark]');
    return {
      radius: getComputedStyle(el).getPropertyValue('--lens-r').trim(),
      x: getComputedStyle(el).getPropertyValue('--lens-x').trim(),
      y: getComputedStyle(el).getPropertyValue('--lens-y').trim(),
      state: el.dataset.lens ?? null,
      layers: el.querySelectorAll('svg').length,
    };
  });

  await page.screenshot({ path: `${OUT}/lens-open.png` });

  results.push({
    check: 'lens opens under the pointer',
    closedRadius: closed,
    ...open,
    pass:
      open.state === 'open' &&
      parseFloat(open.radius) > 20 &&
      open.x !== '50%' &&
      open.layers === 2,
  });

  await page.mouse.move(10, 10);
  await page.waitForTimeout(600);
  const afterLeave = await page.evaluate(() =>
    document.querySelector('[data-wordmark]').dataset.lens ?? null
  );
  results.push({
    check: 'lens closes on leave',
    state: afterLeave,
    pass: afterLeave === null,
  });
}

// ── 2. The ticker ──────────────────────────────────────────────────────────
{
  const seen = new Set();
  for (let i = 0; i < 90; i++) {
    const txt = await page.evaluate(
      () => document.querySelector('[data-ticker-text]')?.textContent ?? ''
    );
    if (txt) seen.add(txt);
    await page.waitForTimeout(140);
  }

  const full = [...seen].filter((s) => s.length > 3);
  const widthStable = await page.evaluate(() => {
    const el = document.querySelector('.unset');
    return el ? Math.round(el.getBoundingClientRect().width) : null;
  });

  results.push({
    check: 'ticker types and cycles labels',
    distinctFrames: seen.size,
    completedLabels: full.filter((s) =>
      ['Em breve', 'Desenvolvimento sob demanda', 'Para empresas'].includes(s)
    ),
    plateWidth: widthStable,
    // Many distinct intermediate strings proves it types rather than swaps.
    pass: seen.size > 15,
  });
}

// ── 3. The score ───────────────────────────────────────────────────────────
{
  // Measure whether the control is actually PAINTED, not merely whether the
  // hidden attribute is present: `display` overrides `hidden`, so the attribute
  // alone proves nothing about what the visitor sees.
  const probe = () =>
    page.evaluate(() => {
      const wrap = document.querySelector('[data-volume-wrap]');
      const box = wrap?.getBoundingClientRect();
      return {
        volumeHidden: wrap?.hasAttribute('hidden'),
        volumePainted: Boolean(box && box.width > 0 && box.height > 0),
        pressed: document.querySelector('[data-sound]')?.getAttribute('aria-pressed'),
        label: document.querySelector('[data-sound-text]')?.textContent?.trim(),
      };
    });

  const before = await probe();
  await page.click('[data-sound]');
  await page.waitForTimeout(1600);
  const after = await probe();

  results.push({
    check: 'sound is off by default and opens a volume control',
    before,
    after,
    pass:
      before.pressed === 'false' &&
      before.volumePainted === false &&
      after.pressed === 'true' &&
      after.volumePainted === true,
  });

  // Toggle back off so the capture below is the default state.
  await page.click('[data-sound]');
  await page.waitForTimeout(700);
}

results.push({
  check: 'console clean',
  errors,
  pass: errors.length === 0,
});

await ctx.close();
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

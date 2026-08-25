/**
 * Functional checks for the lens, the ticker and the score.
 * Each one is a claim; each one gets exercised rather than eyeballed.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4321';

// The boot screen covers the page until the field is up. Everything below acts
// on the landing, so wait for the cover to be gone rather than racing it.
const awaitBoot = (p) =>
  p.waitForFunction(() => !document.documentElement.hasAttribute('data-booting'), {
    timeout: 20000,
  });

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
await awaitBoot(page);
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
// Two claims now, not one: it still types, AND the block tracks the label it is
// typing instead of sitting at the longest string's width.
{
  const EXPECTED = ['Coming soon', 'Software Development', 'Building the future'];
  const seen = new Set();
  const widths = [];

  for (let i = 0; i < 150; i++) {
    const frame = await page.evaluate(() => ({
      text: document.querySelector('[data-ticker-text]')?.textContent ?? '',
      width: Math.round(
        document.querySelector('.unset')?.getBoundingClientRect().width ?? 0
      ),
    }));
    if (frame.text) seen.add(frame.text);
    if (frame.width) widths.push(frame.width);
    await page.waitForTimeout(120);
  }

  const completed = [...seen].filter((s) => EXPECTED.includes(s));
  const min = Math.min(...widths);
  const max = Math.max(...widths);

  results.push({
    check: 'ticker types, cycles the supplied labels, and the block grows with them',
    distinctFrames: seen.size,
    completedLabels: completed,
    blockWidth: { min, max, spread: max - min },
    pass:
      // Many distinct intermediate strings proves it types rather than swaps.
      seen.size > 15 &&
      // At least two of the three supplied labels completed in the window.
      completed.length >= 2 &&
      // The longest label is ~11 characters longer than the shortest, so a
      // block that tracks them must move by well over a hundred pixels.
      max - min > 100,
  });
}

// ── 2b. Icon controls ──────────────────────────────────────────────────────
// The word is folded to zero width, not removed: the accessible name must be
// intact while the printed width is not, and hover must open it.
{
  const probe = async (selector) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const word = el?.querySelector('.plate__word');
      return {
        width: Math.round(el?.getBoundingClientRect().width ?? 0),
        wordWidth: Math.round(word?.getBoundingClientRect().width ?? 0),
        // What assistive tech reads, assembled the way the browser assembles it.
        name: (el?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        icon: el?.querySelector('svg:not([style*="display: none"])')?.dataset.icon ?? null,
      };
    }, selector);

  for (const [label, selector] of [
    ['motion', '[data-motion]'],
    ['sound', '[data-sound]'],
    ['github', 'a[href*="github.com"]'],
    ['linkedin', 'a[href*="linkedin.com"]'],
  ]) {
    const collapsed = await probe(selector);
    await page.hover(selector);
    await page.waitForTimeout(520);
    const open = await probe(selector);
    await page.mouse.move(700, 500);
    await page.waitForTimeout(460);

    results.push({
      check: `${label} control: icon only until hover, name always present`,
      collapsed,
      open,
      pass:
        collapsed.wordWidth === 0 &&
        open.wordWidth > 20 &&
        open.width > collapsed.width + 20 &&
        collapsed.name.length > 2,
    });
  }

  const links = await page.evaluate(() =>
    [...document.querySelectorAll('.social a')].map((a) => ({
      href: a.getAttribute('href'),
      rel: a.getAttribute('rel'),
      target: a.getAttribute('target'),
    }))
  );

  results.push({
    check: 'profile links point at the supplied handle and open safely',
    links,
    pass:
      links.length === 2 &&
      links.some((l) => l.href === 'https://github.com/fernandofilter') &&
      links.some((l) => l.href === 'https://www.linkedin.com/in/fernandofilter') &&
      links.every((l) => l.target === '_blank' && /noopener/.test(l.rel ?? '')),
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
      const btn = document.querySelector('[data-sound]');
      // Which of the two marks the plate is actually printing.
      const painted = [...(btn?.querySelectorAll('svg') ?? [])]
        .filter((s) => s.getBoundingClientRect().width > 0)
        .map((s) => s.dataset.icon);
      return {
        volumeHidden: wrap?.hasAttribute('hidden'),
        volumePainted: Boolean(box && box.width > 0 && box.height > 0),
        pressed: btn?.getAttribute('aria-pressed'),
        state: document.querySelector('[data-sound-state]')?.textContent?.trim(),
        icon: painted,
      };
    });

  const before = await probe();
  await page.click('[data-sound]');
  await page.waitForTimeout(1600);
  const after = await probe();

  results.push({
    check: 'sound is off by default, opens a volume control, and swaps its mark',
    before,
    after,
    pass:
      before.pressed === 'false' &&
      before.volumePainted === false &&
      before.icon?.[0] === 'material-symbols:volume-off-sharp' &&
      after.pressed === 'true' &&
      after.volumePainted === true &&
      after.icon?.[0] === 'material-symbols:volume-up-sharp',
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

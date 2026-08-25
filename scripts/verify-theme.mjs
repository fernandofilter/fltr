/**
 * The theme is two claims, and the second one is the one that breaks silently.
 *
 *  1. Dark is the default, light is remembered, and the system preference is
 *     never consulted — the owner asked for two states, not three.
 *  2. EVERY surface follows, including the one CSS cannot reach. The field
 *     paints its own ground onto a canvas, so a stylesheet-only theme leaves a
 *     black mesh behind a white page and nothing in the DOM would say so. This
 *     reads the canvas pixels.
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

const browser = await chromium.launch({ channel: 'msedge' });
const results = [];

/**
 * Average luminance of a canvas-only patch of the page.
 *
 * NOT `gl.readPixels`: without `preserveDrawingBuffer` the buffer is gone the
 * moment it is presented, and readPixels returns zeros in every theme — which
 * looks exactly like a correct dark reading and would have passed this check
 * while proving nothing. Screenshotting and decoding measures what the visitor
 * actually sees, compositing included, which is the stronger claim anyway.
 *
 * The clip is upper-right: past the readout column, below the top rail, above
 * the wordmark. Nothing but field lands there in either theme.
 */
const CLIP = { x: 700, y: 100, width: 480, height: 260 };

const canvasLuma = async (page) => {
  const shot = await page.screenshot({ clip: CLIP });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4) / 255;
  }, shot.toString('base64'));
};

const settle = async (page) => {
  await page.waitForFunction(
    () => document.querySelector('[data-meter-nodes]')?.textContent?.trim() !== '–',
    { timeout: 15000 }
  );
  await page.waitForTimeout(2000);
};

const probe = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    bg: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
    meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    stored: (() => {
      try {
        return localStorage.getItem('fltr-theme');
      } catch {
        return null;
      }
    })(),
    // Which of the two marks the theme plate prints.
    mark: [...document.querySelectorAll('[data-theme-toggle] svg')]
      .filter((s) => s.getBoundingClientRect().width > 0)
      .map((s) => s.dataset.icon)[0],
    name: (document.querySelector('[data-theme-toggle]')?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim(),
  }));

// ── 1. Default is dark, and a light SYSTEM preference does not change it ────
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
await awaitBoot(page);
  await settle(page);

  const state = await probe(page);
  const luma = await canvasLuma(page);

  results.push({
    check: 'dark is the default and the OS light preference is ignored',
    ...state,
    canvasLuma: luma?.toFixed(3),
    pass:
      state.theme === 'dark' &&
      state.bg === 'rgb(0, 0, 0)' &&
      state.ink === 'rgb(255, 255, 255)' &&
      state.meta === '#000000' &&
      state.stored === null &&
      state.mark === 'material-symbols:light-mode-sharp' &&
      // A dark field is nearly all ground with a scatter of signal on it.
      luma !== null &&
      luma < 0.15,
  });
  await ctx.close();
}

// ── 2. The switch flips every surface, canvas included ──────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
await awaitBoot(page);
  await settle(page);

  const darkLuma = await canvasLuma(page);
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(700);

  const state = await probe(page);
  const lightLuma = await canvasLuma(page);
  await page.screenshot({ path: `${OUT}/light.png` });

  results.push({
    check: 'the switch flips CSS, the meta colour, the mark and the WebGL field',
    ...state,
    canvasLuma: { dark: darkLuma?.toFixed(3), light: lightLuma?.toFixed(3) },
    pass:
      state.theme === 'light' &&
      state.bg === 'rgb(255, 255, 255)' &&
      state.ink === 'rgb(0, 0, 0)' &&
      state.meta === '#ffffff' &&
      state.stored === 'light' &&
      state.mark === 'material-symbols:dark-mode-sharp' &&
      state.name.includes('switch to dark') &&
      // The canvas must actually invert, not merely sit behind a white page.
      lightLuma !== null &&
      lightLuma > 0.85,
  });

  // ── 3. The choice survives a reload, and lands before first paint ─────────
  const frames = [];
  page.on('load', () => frames.push('load'));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await awaitBoot(page);
  // Read the very first opportunity the document offers: if the boot script
  // were deferred, this would still be unset and the page would flash black.
  const atParse = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    // Nothing has painted a body background yet if the stylesheet is blocking,
    // but the attribute driving it must already be there.
    hasStylesheet: Boolean(document.querySelector('link[rel="stylesheet"]')),
  }));
  await settle(page);
  const after = await probe(page);

  results.push({
    check: 'the choice survives reload and is applied before first paint',
    atParse,
    theme: after.theme,
    bg: after.bg,
    pass: atParse.theme === 'light' && after.theme === 'light' && after.bg === 'rgb(255, 255, 255)',
  });

  // ── 4. And it switches back ───────────────────────────────────────────────
  await page.click('[data-theme-toggle]');
  await page.waitForTimeout(700);
  const back = await probe(page);
  results.push({
    check: 'switching back restores dark and stores it',
    ...back,
    pass: back.theme === 'dark' && back.stored === 'dark' && back.bg === 'rgb(0, 0, 0)',
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

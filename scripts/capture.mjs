/**
 * Inspection capture.
 *
 * The harness's browser pane cannot composite frames in this session, so
 * screenshots come from a headless Edge via playwright-core instead. Captures
 * are only evidence when they are valid, so this script waits for the field to
 * have actually booted and for the entrance beat to have settled before it
 * shoots — an element still animating in reads as a missing element and gets
 * "fixed" into a regression.
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

const SHOTS = [
  { name: 'desktop', width: 1440, height: 900, path: '/' },
  { name: 'mobile', width: 390, height: 844, path: '/', isMobile: true },
  { name: 'desktop-light', width: 1440, height: 900, path: '/', theme: 'light' },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
    isMobile: Boolean(shot.isMobile),
    hasTouch: Boolean(shot.isMobile),
  });
  const page = await context.newPage();

  // The page never consults `prefers-color-scheme` — there is no system option
  // by decision — so a themed shot is set the same way a visitor sets it, by
  // seeding the stored choice before the boot script reads it.
  if (shot.theme) {
    await page.addInitScript((t) => {
      try {
        localStorage.setItem('fltr-theme', t);
      } catch (e) {}
    }, shot.theme);
  }

  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
await awaitBoot(page);

  // The field boots on requestIdleCallback; wait for it to report real values
  // rather than guessing with a fixed sleep.
  await page
    .waitForFunction(
      () => {
        const n = document.querySelector('[data-meter-nodes]');
        return n && n.textContent && n.textContent.trim() !== '–';
      },
      { timeout: 15000 }
    )
    .catch(() => console.warn(`[${shot.name}] field never reported — capturing anyway`));

  // Let the 1400ms entrance ease-out finish and settle.
  await page.waitForTimeout(2200);

  const file = `${OUT}/${shot.name}.png`;
  await page.screenshot({ path: file, fullPage: false });

  const audit = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    const body = getComputedStyle(document.body);
    const wordmark = document.querySelector('.wordmark svg');
    const wmBox = wordmark ? wordmark.getBoundingClientRect() : null;
    return {
      webgl: Boolean(gl),
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      bodyBg: body.backgroundColor,
      bodyColor: body.color,
      font: body.fontFamily,
      wordmark: wmBox ? `${Math.round(wmBox.width)}x${Math.round(wmBox.height)}` : null,
      nodes: document.querySelector('[data-meter-nodes]')?.textContent ?? null,
      amplitude: document.querySelector('[data-meter-amp]')?.textContent ?? null,
      docScrollW: document.documentElement.scrollWidth,
      viewportW: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  console.log(`\n── ${shot.name} (${shot.width}x${shot.height}) → ${file}`);
  console.log(JSON.stringify(audit, null, 2));
  if (consoleErrors.length) console.log('CONSOLE ERRORS:', consoleErrors);
  else console.log('console: clean');

  await context.close();
}

await browser.close();

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
const OUT = '.impeccable/review';

const SHOTS = [
  { name: 'desktop', width: 1440, height: 900, path: '/' },
  { name: 'mobile', width: 390, height: 844, path: '/', isMobile: true },
  { name: 'desktop-en', width: 1440, height: 900, path: '/en/' },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
    isMobile: Boolean(shot.isMobile),
    hasTouch: Boolean(shot.isMobile),
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });

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

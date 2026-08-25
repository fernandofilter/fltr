<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="The fltr landing page: the wordmark low and left over a white point mesh rolling across a black ground, with live field readouts up the margin and along the foot rail." src="docs/assets/hero-dark.png">
</picture>

<sub>English · <a href="README.pt-BR.md">Português</a></sub>

# fltr

Source of the landing page for **fltr**, a software development service.

```text
SHIPPED ─────────────────────────────────────────────── gzip ──
three.js + field   █████████████████████████    126 KB   deferred island
Martian Mono ×3    ██████░░░░░░░░░░░░░░░░░░░     31 KB   self-hosted
HTML               ██░░░░░░░░░░░░░░░░░░░░░░░    8.4 KB
CSS                █░░░░░░░░░░░░░░░░░░░░░░░░    3.2 KB   no framework
Page scripts       █░░░░░░░░░░░░░░░░░░░░░░░░    3.5 KB   no UI library
Audio              ░░░░░░░░░░░░░░░░░░░░░░░░░       0 B   synthesised at runtime

SOURCE ──────────────────────────────────────────────── lines ─
.astro             █████████████████████████     1,590
.mjs   verify      ████████████████░░░░░░░░░     1,023
.ts    mesh, score ███████████████░░░░░░░░░░       925
.css   one file    █████░░░░░░░░░░░░░░░░░░░░       318

VERIFIED ────────────────────────────────── npm run verify ────
boot 4  ·  features 10  ·  exits 3  ·  theme 4  ·  audio 5
                                             26 checks, 0 fixtures
```

Those are measured, not decorative — which is the same rule the page itself
runs on: every number it prints is sampled from the mesh on the frame it is
shown. It also has two mandatory exits, `prefers-reduced-motion` and no-WebGL,
both exercised above.

> Not published yet — no deploy target chosen, so there is no live URL.

## Run

```bash
npm install && npm run dev
```

## Verify

```bash
npm run preview
```

```bash
npm run verify
```

## License

© 2026 Fernando Filter. All rights reserved.

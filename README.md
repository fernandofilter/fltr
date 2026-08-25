<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="The fltr landing page: the wordmark low and left over a white point mesh rolling across a black ground, with live field readouts up the margin and along the foot rail." src="docs/assets/hero-dark.png">
</picture>

<sub>English · <a href="README.pt-BR.md">Português</a></sub>

# fltr

![Astro 7.2.6](https://img.shields.io/badge/astro-7.2.6-000?style=for-the-badge&labelColor=000&color=fff)
![three.js r185](https://img.shields.io/badge/three.js-r185-000?style=for-the-badge&labelColor=000&color=fff)
![TypeScript strict](https://img.shields.io/badge/typescript-strict-000?style=for-the-badge&labelColor=000&color=fff)
![No dependencies at runtime](https://img.shields.io/badge/ui%20framework-none-000?style=for-the-badge&labelColor=000&color=fff)

Source of the landing page for **fltr**, a software development service.

The page carries no prose by decision, so it demonstrates instead: a real WebGL
point mesh, a lo-fi loop synthesised at runtime rather than shipped as a file,
and readouts sampled from the mesh on the frame they are shown.

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

26 checks across five suites: the boot handoff, the page's features, the two
mandatory exits (`prefers-reduced-motion` and no-WebGL), the theme — read from
rendered pixels, not the DOM — and the audio, measured through an analyser.

## License

© 2026 Fernando Filter. All rights reserved.

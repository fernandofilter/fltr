<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="The fltr landing page: the wordmark low and left over a white point mesh rolling across a black ground, with live field readouts up the margin and along the foot rail." src="docs/assets/hero-dark.png">
</picture>

<sub>English · <a href="README.pt-BR.md">Português</a></sub>

# fltr

Source of the landing page for **fltr**, a software development service.

> Not published yet — no deploy target chosen, so there is no live URL. The
> images above are captures of the page as it builds today.

## Stack

- **Astro** — static output, no UI framework
- **three.js** — the point mesh, shipped as a deferred island
- **Martian Mono** — one family, self-hosted, three weights

No CSS framework, no component library.

## Notable

- Two values and no grey token; light mode is the same palette inverted
- Depth in the field is carried by point size, never by an opacity ramp
- Every printed number is sampled from the mesh on the frame it is shown
- The lo-fi loop is synthesised at runtime — no audio file, no licence question
- Two mandatory exits: no WebGL, and `prefers-reduced-motion`
- The boot screen holds the field's entrance until the moment it lifts

## Run

```bash
npm install && npm run dev
```

`npm run build` writes a static site to `dist/`; `npm run preview` serves it.

## Verify

Start a server, then run the suites against it:

```bash
npm run preview
```

```bash
npm run verify
```

`verify:boot` · `verify:features` · `verify:exits` · `verify:theme` ·
`verify:audio` run individually. `npm run capture` regenerates the screenshots
above.

## License

© 2026 Fernando Filter. All rights reserved.

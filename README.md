<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="The fltr landing page: the wordmark low and left over a white point mesh rolling across a black ground, with live field readouts up the margin and along the foot rail." src="docs/assets/hero-dark.png">
</picture>

<sub>English · <a href="README.pt-BR.md">Português</a></sub>

# fltr

Source of the landing page for **fltr**, a software development service.

The page carries no prose by decision. Its elements are the wordmark, a
generated field, one contact, and two profile links — which means the page has
nothing to tell you and has to demonstrate instead. Everything below is what it
demonstrates with.

> **Status** — not published yet. No deploy target has been chosen, so there is
> no live URL to link. The images above are captures of the page as it builds
> today.

## Built with

| | |
|---|---|
| **Astro** | Static output. No UI framework — the only client JavaScript is the field, the score and the page's own controls. |
| **three.js** | The point mesh. Ships as a deferred island, so the wordmark and the contact paint before the library is even requested. |
| **Martian Mono** | One family, self-hosted, three weights. The whole type system is one tracked uppercase label primitive. |

No CSS framework and no component library. Styling is plain CSS with a handful
of tokens.

## Decisions worth knowing

Every one of these is load-bearing, and each is easy to undo by accident.

**Two values, one inversion.** There is no grey token in the system and none
should be added — tone is carried by *density* (point spacing, dash pattern,
glyph weight), never by a washed-out fill. Tokens are named for their role
(`--ground`, `--signal`) rather than their colour, which is what makes light
mode the same palette read the other way instead of a second palette to keep in
sync. Dark is the default and `prefers-color-scheme` is deliberately never
consulted: two states, not three.

**The field is the technique, not a picture of it.** A real WebGL point mesh
displaced in the vertex shader. Depth is carried by point size alone — an alpha
ramp between the world's two values would be a grey token wearing a different
name.

**The numbers are measured.** The values on the margin and the foot rail are
sampled from the mesh on the frame they are shown. Nothing on this page is a
decorative metric, which is also why the boot screen reports real stages rather
than a fake progress bar.

**The score is synthesised, never a file.** The lo-fi loop — four bars at 72 BPM,
ii–V–I–IV in F — is generated from oscillators and noise at runtime. A
third-party track on a public page is a licensing question nobody asked and one
an mp3 cannot answer; generating it also costs zero bytes of audio payload. The
mesh's measured amplitude walks the mix's lowpass cutoff, so what you see and
what you hear run off one number.

**Two exits are mandatory.** A high-contrast field in continuous motion is a
photosensitivity risk, so: no WebGL falls back to a still bar field, and
`prefers-reduced-motion` holds the mesh resolved but not moving. There is a
visible stop control as well, because not everyone at risk has set an OS
preference — and it hides itself when WebGL is absent, since a stop button for
motion that cannot happen is a control that lies.

**The boot screen protects the entrance.** The page has one authored motion beat:
the mesh resolving out of a flat plane. While the boot screen is up that
entrance is *held* at zero, and released on the same tick the cover wipes away.

## Running it

```bash
npm install
```

```bash
npm run dev
```

`npm run build` writes a static site to `dist/`, and `npm run preview` serves it.

## Verifying it

The claims above are exercised rather than asserted. Start a server, then run
the suites against it:

```bash
npm run preview
```

```bash
npm run verify
```

| Script | What it proves |
|---|---|
| `verify:boot` | The cover is up before first paint and the page behind it is inert; every stage reports a measured value, cross-checked against the rail meter; the mesh stays flat while covered and resolves once it lifts. |
| `verify:features` | The wordmark lens, the typing ticker and its elastic block, the icon controls' hover reveal and accessible names, the profile links. |
| `verify:exits` | Reduced motion holds the field; no WebGL still ships a page; the stop control actually stops it. |
| `verify:theme` | Dark is the default, the OS preference is ignored, the choice survives a reload — and the WebGL canvas inverts too, read from the rendered pixels rather than from the DOM. |
| `verify:audio` | The loop plays, has dynamics, stops on demand, and its noise bed sits under the music — measured through an analyser spliced in front of the destination. |

`npm run capture` regenerates the reference screenshots.

## Layout

```
src/
  components/    Boot, WaveField, Wordmark, Ticker, Landing
  scripts/       wave-field.ts (the mesh), field-audio.ts (the score)
  styles/        global.css — tokens, the label primitive, the plate
  copy.ts        every string the page prints
  site.config.ts contact and profile links
scripts/         verification suites and the capture pipeline
docs/            assets and agent notes
```

`src/copy.ts` is one module rather than strings inlined across components on
purpose: it is the only place the page's standing rule — that nothing may be
authored to fill space, and no claim may be made that was not supplied — can be
enforced by reading.

## License

© 2026 Fernando Filter. All rights reserved.

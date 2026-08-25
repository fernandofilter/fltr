---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/components/Landing.astro","src/copy.ts"]
---

## Scope and visitor mode

The single landing at `/`. Mode: **Persuade, no funnel** — the visitor's success
is comprehension and trust, not a click.

**English only.** The two-locale build (`/` pt + `/en/`) was removed at the
owner's request; `src/i18n/` and the `/en/` route are gone and every string now
lives in `src/copy.ts`. Keeping one module rather than inlining strings is not
i18n scaffolding left behind — it is the only place the page's standing rule
("nothing may be authored to fill space") can be enforced by reading.

## Audience, job, action, proof

A business buyer arriving warm, by referral or by searching the name, asking one
question in about twenty seconds: is this serious?

By the owner's decision this surface carries **no prose**. Its elements are the
wordmark, the field, one contact, and — added later, at the owner's request —
two profile links (GitHub and LinkedIn, handle `fernandofilter`). The profiles
are the only outbound evidence the page carries and the only claim on it that
can be checked, which is why they sit in the foot rail rather than the stage:
the wordmark keeps the stage. That makes the page's own execution the
only proof on offer: it cannot tell, so it demonstrates.

**Nothing here may be invented.** No clients, testimonials, metrics, prices, or
project counts exist, and none may be authored to fill space. The numbers on the
rails are exempt because they are not claims: they are sampled from the mesh on
screen on the frame they are shown.

## Chosen direction and memorable moment

Data-sublime field (Ikeda catalog world), adopted by the user over the roll's
assigned direction; seed `58abe2f6`. Pinned by the user after selection: the
field is a three.js point mesh — dark ground, signal-coloured points and text —
taking reference image 2 (dot-mesh wave) as binding and discarding reference
image 1, whose modulated greys contradict the world's two values. Light mode
inverts which of the two values is ground; it does not introduce a third.

The memorable moment is the entrance: the mesh resolves out of a flat plane once,
exponential ease-out, and the wordmark is already there when it does.

**The boot screen exists to protect that beat, not to compete with it.** It
covers the page while the field loads, and the field's entrance is HELD at zero
underneath — the mesh renders flat, measurable and reporting, but unspent. The
cover wipes and the entrance releases on the same tick, so the curtain lifting
and the field resolving are one gesture. Anything that plays the entrance while
the cover is up has thrown the page's only authored moment away.

## Constraints that bind this surface

- three.js is a user-pinned requirement, ~126 KB gzip. It ships as a deferred
  island so the wordmark and contact never wait on it.
- Two exits are mandatory and verified: no WebGL falls back to a still bar field,
  and `prefers-reduced-motion` holds the mesh resolved but still. A visible stop
  control exists as well, because a moving high-contrast field is a
  photosensitivity risk and not everyone at risk sets an OS preference.
- The stop control is hidden when WebGL is absent: a stop button for motion that
  cannot happen is a control that lies.
- The wordmark ships inline, never as `<img>` — it uses `currentColor`, which an
  `<img>` would isolate from the page and render black on black.
- Tone comes from density, never opacity: no grey token, and no alpha ramp
  standing in for one.
- **Two themes, one palette.** Tokens are named for their role (`--ground`,
  `--signal`), not their colour, and light mode swaps the two. It is the world's
  own state language — inversion — applied at page scale, not a second palette
  to keep in sync; anything that hardcodes black or white breaks it. Dark is the
  default and `prefers-color-scheme` is deliberately never consulted: the owner
  asked for two states, so an unset visitor gets dark and a visitor who chose
  gets their choice. The theme lands on `<html>` from an `is:inline` script in
  the head, ahead of first paint, or a light-mode visitor flashes black on every
  load. The WebGL field is the one surface CSS cannot reach: it takes the theme
  through `setTheme` and repaints on the spot, because a held field has no frame
  coming.
- The score is **synthesised, never a file**. It is a lo-fi loop (four bars,
  72 BPM, ii–V–I–IV in F) rather than the original drone, but the reason it is
  generated is unchanged and still binding: a third-party track on a public page
  is a licensing question nobody asked and one an mp3 cannot answer. It also
  keeps the audio coupled to the visual — the mesh's measured amplitude walks
  the mix's lowpass cutoff. Its noise bed — vinyl crackle and tape hiss —
  runs THROUGH the veil, not past it, and sits at roughly 7% of the median mix
  level; `scripts/verify-audio.mjs` measures that ratio, because a noise bed
  that creeps up changes no peak and simply makes the loop read as noisy. Do not
  replace it with an audio asset unless the owner supplies one they hold the
  rights to.
- **The boot screen's stages are measured.** A fake loader was explicitly
  allowed and was not built, because this page's standing rule is that the
  numbers it prints are sampled from the thing on screen — a fabricated
  progress bar above the rail readouts would be the one lie on it. The four
  stages (faces loaded, WebGL context obtained, nodes built, ms to first frame)
  come from the boot itself; `scripts/verify-boot.mjs` checks MESH against the
  rail meter, which counts the same nodes by a path the boot never took. The
  minimum and maximum display times are about display, never about a stage: a
  loader that flashes is worse than none, and a boot that never reports must
  still hand the page over — the stages that did not answer say so. It is also
  opt-in from the head script, so a visitor with JS off never gets a cover they
  cannot dismiss, and the shell is `inert` while it is up.
- **Mesh density is chosen, not assumed.** It used to come from viewport width
  alone — a guess about the screen standing in for a fact about the machine, so
  an old laptop on a wide monitor got the same fifty thousand points as a new
  one. Now four steps (11k / 21k / 37k / 63k at desktop width) sit behind a rail
  control, the foot rail's NODES meter is their readout, and the choice is
  stored. The field also measures its own median frame time once, after the
  entrance settles, and steps down if it cannot hold the rate — but a stored
  choice always outranks that measurement. Point scale rises as the square root
  of the thinning, or a sparser field is just a fainter one.
  **Do not benchmark this with CPU throttling.** It is GPU-bound; Chrome's
  throttle reported an identical 13ms at 1x and at 6x. `verify-density.mjs`
  injects real per-frame main-thread work instead, which is what a slow machine
  actually has.
- Rail controls print a **mark, not a word**. Material Symbols in the sharp cut
  (zero corner radius, the one geometry this world already obeys), inlined as
  SVG at build time. The word is folded to zero width by an animated grid track
  and opens on hover or focus; it is clipped, never removed, so the accessible
  name is intact for a visitor who has no hover to give.

## Unresolved

- **Contact mechanism and address.** Never supplied. `src/site.config.ts` holds
  the single placeholder and the page renders a visible "not set" state until it
  is filled.
- Positioning and deploy target remain open from init and do not block this
  surface.
- Dead space in the upper third at portrait widths is a known open composition
  finding, left for review rather than tuned further in the build thread.

---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/en/index.astro","src/components/Landing.astro"]
---

## Scope and visitor mode

The single landing at `/` (pt) and `/en/`. Mode: **Persuade, no funnel** — the
visitor's success is comprehension and trust, not a click.

## Audience, job, action, proof

A business buyer arriving warm, by referral or by searching the name, asking one
question in about twenty seconds: is this serious?

By the owner's decision this surface carries **no prose**. Its three elements are
the wordmark, the field, and one contact. That makes the page's own execution the
only proof on offer: it cannot tell, so it demonstrates.

**Nothing here may be invented.** No clients, testimonials, metrics, prices, or
project counts exist, and none may be authored to fill space. The numbers on the
rails are exempt because they are not claims: they are sampled from the mesh on
screen on the frame they are shown.

## Chosen direction and memorable moment

Data-sublime field (Ikeda catalog world), adopted by the user over the roll's
assigned direction; seed `58abe2f6`. Pinned by the user after selection: the
field is a three.js point mesh, black ground, white points and text, taking
reference image 2 (dot-mesh wave) as binding and discarding reference image 1,
whose modulated greys contradict the world's two values.

The memorable moment is the entrance: the mesh resolves out of a flat plane once,
exponential ease-out, and the wordmark is already there when it does.

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

## Unresolved

- **Contact mechanism and address.** Never supplied. `src/site.config.ts` holds
  the single placeholder and the page renders a visible "not set" state until it
  is filled.
- Positioning and deploy target remain open from init and do not block this
  surface.
- Dead space in the upper third at portrait widths is a known open composition
  finding, left for review rather than tuned further in the build thread.

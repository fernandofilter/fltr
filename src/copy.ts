/**
 * Every string the page prints.
 *
 * This replaced a two-locale i18n module at the owner's request: the site is
 * English only. It is still ONE module rather than strings inlined across
 * components, because the page's whole rule is that nothing may be authored to
 * fill space — and a single list is the only place that rule can be enforced by
 * reading. If a claim is not in this file, the page does not make it.
 *
 * What is translated here is the interface itself: control names and field
 * labels. The page carries no prose by decision — wordmark, field, contact.
 */
export const copy = {
  /* The printed word on a control names WHAT it governs and never changes. The
     mark and the hidden state suffix carry the state, so the label never has to
     contradict itself mid-hover. */
  motionLabel: 'Motion',
  /* Appended to the printed label to form the accessible name, so the visible
     text stays a prefix of it — which is what WCAG 2.5.3 asks. */
  motionRunning: 'running',
  motionHeld: 'held',

  soundLabel: 'Music',
  soundPlaying: 'playing',
  soundSilent: 'silent',
  soundVolume: 'Music volume',

  /**
   * The mesh's point count, as a control. The foot rail already prints NODES;
   * this makes that number something the visitor moves rather than reads.
   */
  densityLabel: 'Density',
  densitySteps: ['Low', 'Medium', 'High', 'Max'] as const,

  /* The theme control is not a toggle in the on/off sense, so it carries no
     `aria-pressed`: its hidden suffix names the ACTION, and the mark shows the
     theme you would move to. */
  themeLabel: 'Theme',
  themeToLight: 'switch to light',
  themeToDark: 'switch to dark',

  github: 'GitHub',
  linkedin: 'LinkedIn',
  profiles: 'Profiles',

  /**
   * The holder is the person, not the mark. Two reasons and both bind: a
   * copyright notice names a legal person, and `.label` uppercases everything
   * it touches — printing the brand here would render `FLTR` and break the one
   * fixed rule in PRODUCT.md, which is that `fltr` keeps its lowercase spelling.
   */
  copyrightHolder: 'Fernando Filter',

  contactUnset: 'Coming soon',
  contactCopy: 'Copy',
  contactCopied: 'Copied',

  fieldReadout: 'Field readout',
  fieldAmplitude: 'Amplitude',
  fieldNodes: 'Nodes',
  fieldFrame: 'Frame',
  fieldStatic: 'Static field — WebGL unavailable',

  metaTitle: 'fltr',
  metaDescription: 'fltr — software development on demand for business clients.',

  fieldAlt:
    'A field of points in a continuous wave, generated in real time.',
  skip: 'Skip to contact',
} as const;

/**
 * The ticker's loop. Supplied verbatim by the owner.
 *
 * The standing rule holds: nothing here may be authored to fill the rotation.
 * No clients, metrics, prices, or capabilities that were never supplied. Add
 * strings only when the owner supplies them.
 */
export const tickerLabels = [
  'Coming soon',
  'Software Development',
  'Building the future',
] as const;

// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

export default defineConfig({
  // Material Symbols in the SHARP cut: zero corner radius, which is the one
  // geometry this world already obeys everywhere else. Icons are inlined as
  // SVG at build time — no icon font, no client runtime, and `currentColor`
  // carries the plate's inversion for free.
  integrations: [
    icon({
      include: {
        'material-symbols': [
          'pause-sharp',
          'play-arrow-sharp',
          'volume-up-sharp',
          'volume-off-sharp',
          'light-mode-sharp',
          'dark-mode-sharp',
        ],
        'simple-icons': ['github', 'linkedin'],
      },
    }),
  ],
});

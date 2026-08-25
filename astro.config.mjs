// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});

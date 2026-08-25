/**
 * The page carries no prose by decision: wordmark, field, contact.
 * What is translated here is therefore the interface itself — control names and
 * field labels. The architecture exists so copy can arrive later without a
 * retrofit, which is the whole reason locale was settled before the build.
 */
export const locales = ['pt', 'en'] as const;
export type Locale = (typeof locales)[number];

export const ui = {
  pt: {
    'lang.name': 'Português',
    'lang.switchTo': 'Ver em inglês',
    'motion.stop': 'Parar movimento',
    'motion.start': 'Retomar movimento',
    'motion.state.running': 'Campo em movimento',
    'motion.state.held': 'Campo parado',
    'contact.label': 'Contato',
    'contact.unset': 'Em breve',
    'contact.copy': 'Copiar',
    'contact.copied': 'Copiado',
    'field.readout': 'Leitura do campo',
    'field.amplitude': 'Amplitude',
    'field.nodes': 'Nós',
    'field.frame': 'Quadro',
    'field.static': 'Campo estático — WebGL indisponível',
    'meta.title': 'fltr',
    'meta.description':
      'fltr — desenvolvimento sob demanda para clientes de negócio.',
    'a11y.fieldAlt':
      'Campo de pontos brancos em onda contínua sobre fundo preto, gerado em tempo real.',
    'a11y.skip': 'Ir para o contato',
  },
  en: {
    'lang.name': 'English',
    'lang.switchTo': 'View in Portuguese',
    'motion.stop': 'Stop motion',
    'motion.start': 'Resume motion',
    'motion.state.running': 'Field in motion',
    'motion.state.held': 'Field held',
    'contact.label': 'Contact',
    'contact.unset': 'Coming soon',
    'contact.copy': 'Copy',
    'contact.copied': 'Copied',
    'field.readout': 'Field readout',
    'field.amplitude': 'Amplitude',
    'field.nodes': 'Nodes',
    'field.frame': 'Frame',
    'field.static': 'Static field — WebGL unavailable',
    'meta.title': 'fltr',
    'meta.description': 'fltr — software development on demand for business clients.',
    'a11y.fieldAlt':
      'A field of white points in a continuous wave on black, generated in real time.',
    'a11y.skip': 'Skip to contact',
  },
} as const;

export type UIKey = keyof (typeof ui)['pt'];

export function t(locale: Locale) {
  return (key: UIKey): string => ui[locale][key];
}

/** The other locale's home path. Two locales, so this is a toggle, not a menu. */
export function otherLocale(locale: Locale): { locale: Locale; href: string; code: string } {
  return locale === 'pt'
    ? { locale: 'en', href: '/en/', code: 'EN' }
    : { locale: 'pt', href: '/', code: 'PT' };
}

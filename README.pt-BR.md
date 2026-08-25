<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="A landing page da fltr: o wordmark baixo à esquerda sobre uma malha de pontos brancos ondulando em fundo preto, com leituras do campo ao vivo na margem e no rail inferior." src="docs/assets/hero-dark.png">
</picture>

<sub><a href="README.md">English</a> · Português</sub>

# fltr

Código-fonte da landing page da **fltr**, um serviço de desenvolvimento de software.

```text
ENVIADO ─────────────────────────────────────────────── gzip ──
three.js + campo   █████████████████████████    126 KB   ilha adiada
Martian Mono ×3    ██████░░░░░░░░░░░░░░░░░░░     31 KB   self-hosted
HTML               ██░░░░░░░░░░░░░░░░░░░░░░░    8.4 KB
CSS                █░░░░░░░░░░░░░░░░░░░░░░░░    3.2 KB   sem framework
Scripts da página  █░░░░░░░░░░░░░░░░░░░░░░░░    3.5 KB   sem lib de UI
Áudio              ░░░░░░░░░░░░░░░░░░░░░░░░░       0 B   sintetizado em runtime

FONTE ──────────────────────────────────────────────── linhas ─
.astro             █████████████████████████     1.590
.mjs   verificação ████████████████░░░░░░░░░     1.023
.ts    malha, som  ███████████████░░░░░░░░░░       925
.css   um arquivo  █████░░░░░░░░░░░░░░░░░░░░       318

VERIFICADO ──────────────────────────────── npm run verify ────
boot 4  ·  features 10  ·  exits 3  ·  theme 4  ·  audio 5
                                            26 checks, 0 fixtures
```

Esses números são medidos, não decorativos — é a mesma regra que a página segue:
todo número que ela imprime é amostrado da malha no frame em que aparece. Ela
também tem duas saídas obrigatórias, `prefers-reduced-motion` e sem-WebGL, ambas
exercitadas acima.

> Ainda não publicada — nenhum alvo de deploy escolhido, então não há URL no ar.

## Rodar

```bash
npm install && npm run dev
```

## Verificar

```bash
npm run preview
```

```bash
npm run verify
```

## Licença

© 2026 Fernando Filter. Todos os direitos reservados.

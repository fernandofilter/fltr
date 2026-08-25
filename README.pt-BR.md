<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="A landing page da fltr: o wordmark baixo à esquerda sobre uma malha de pontos brancos ondulando em fundo preto, com leituras do campo ao vivo na margem e no rail inferior." src="docs/assets/hero-dark.png">
</picture>

<sub><a href="README.md">English</a> · Português</sub>

# fltr

![Astro 7.2.6](https://img.shields.io/badge/astro-7.2.6-000?style=for-the-badge&labelColor=000&color=fff)
![three.js r185](https://img.shields.io/badge/three.js-r185-000?style=for-the-badge&labelColor=000&color=fff)
![TypeScript strict](https://img.shields.io/badge/typescript-strict-000?style=for-the-badge&labelColor=000&color=fff)
![Sem framework de UI](https://img.shields.io/badge/framework%20de%20ui-nenhum-000?style=for-the-badge&labelColor=000&color=fff)

Código-fonte da landing page da **fltr**, um serviço de desenvolvimento de software.

A página não carrega texto corrido, por decisão, então ela demonstra: uma malha
de pontos WebGL de verdade, um loop lo-fi sintetizado em tempo de execução em vez
de entregue como arquivo, e leituras amostradas da malha no frame em que aparecem.

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

26 checks em cinco suítes: o handoff do boot, as features da página, as duas
saídas obrigatórias (`prefers-reduced-motion` e sem-WebGL), o tema — lido dos
pixels renderizados, não do DOM — e o áudio, medido por um analisador.

## Licença

© 2026 Fernando Filter. Todos os direitos reservados.

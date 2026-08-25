<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="A landing page da fltr: o wordmark baixo à esquerda sobre uma malha de pontos brancos ondulando em fundo preto, com leituras do campo ao vivo na margem e no rail inferior." src="docs/assets/hero-dark.png">
</picture>

<sub><a href="README.md">English</a> · Português</sub>

# fltr

Código-fonte da landing page da **fltr**, um serviço de desenvolvimento de software.

> Ainda não publicada — nenhum alvo de deploy foi escolhido, então não há URL no
> ar. As imagens acima são capturas da página como ela é construída hoje.

## Stack

- **Astro** — saída estática, sem framework de UI
- **three.js** — a malha de pontos, como ilha adiada
- **Martian Mono** — uma família, self-hosted, três pesos

Sem framework de CSS, sem biblioteca de componentes.

## Destaques

- Dois valores e nenhum token de cinza; light mode é a mesma paleta invertida
- A profundidade do campo vem do tamanho do ponto, nunca de uma rampa de opacidade
- Todo número impresso é amostrado da malha no frame em que aparece
- O loop lo-fi é sintetizado em tempo de execução — sem arquivo, sem licenciamento
- Duas saídas obrigatórias: sem WebGL, e `prefers-reduced-motion`
- A tela de boot segura a entrada do campo até o instante em que ela sobe

## Rodar

```bash
npm install && npm run dev
```

`npm run build` escreve um site estático em `dist/`; `npm run preview` o serve.

## Verificar

Suba um servidor e rode as suítes contra ele:

```bash
npm run preview
```

```bash
npm run verify
```

`verify:boot` · `verify:features` · `verify:exits` · `verify:theme` ·
`verify:audio` rodam individualmente. `npm run capture` regenera as capturas
acima.

## Licença

© 2026 Fernando Filter. Todos os direitos reservados.

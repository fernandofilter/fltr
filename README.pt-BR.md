<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
  <img alt="A landing page da fltr: o wordmark baixo à esquerda sobre uma malha de pontos brancos ondulando em fundo preto, com leituras do campo ao vivo na margem e no rail inferior." src="docs/assets/hero-dark.png">
</picture>

<sub><a href="README.md">English</a> · Português</sub>

# fltr

Código-fonte da landing page da **fltr**, um serviço de desenvolvimento de
software.

A página não carrega texto corrido, por decisão. Seus elementos são o wordmark,
um campo gerado, um contato e dois links de perfil — o que significa que ela não
tem nada a dizer e precisa demonstrar. Tudo abaixo é aquilo com que ela demonstra.

> **Status** — ainda não publicada. Nenhum alvo de deploy foi escolhido, então
> não há URL no ar para linkar. As imagens acima são capturas da página como ela
> é construída hoje.

## Construída com

| | |
|---|---|
| **Astro** | Saída estática. Sem framework de UI — o único JavaScript no cliente é o campo, a trilha e os controles da própria página. |
| **three.js** | A malha de pontos. Vai como uma ilha adiada, então o wordmark e o contato pintam antes da biblioteca sequer ser requisitada. |
| **Martian Mono** | Uma família, self-hosted, três pesos. O sistema tipográfico inteiro é um primitivo de label em caixa alta com tracking. |

Sem framework de CSS e sem biblioteca de componentes. A estilização é CSS puro
com um punhado de tokens.

## Decisões que vale conhecer

Todas são estruturais, e cada uma é fácil de desfazer sem querer.

**Dois valores, uma inversão.** Não existe token de cinza no sistema e nenhum
deve ser adicionado — o tom é carregado por *densidade* (espaçamento dos pontos,
padrão de traço, peso do glifo), nunca por um preenchimento lavado. Os tokens são
nomeados pelo papel (`--ground`, `--signal`) e não pela cor, e é isso que faz do
light mode a mesma paleta lida ao contrário em vez de uma segunda paleta para
manter sincronizada. Dark é o padrão e `prefers-color-scheme` deliberadamente
nunca é consultado: dois estados, não três.

**O campo é a técnica, não um retrato dela.** Uma malha de pontos WebGL de
verdade, deslocada no vertex shader. A profundidade é carregada só pelo tamanho
do ponto — uma rampa de alpha entre os dois valores do mundo seria um token de
cinza com outro nome.

**Os números são medidos.** Os valores na margem e no rail inferior são
amostrados da malha no frame em que aparecem. Nada nessa página é métrica
decorativa, e é também por isso que a tela de boot reporta estágios reais em vez
de uma barra de progresso falsa.

**A trilha é sintetizada, nunca um arquivo.** O loop lo-fi — quatro compassos a
72 BPM, ii–V–I–IV em Fá — é gerado por osciladores e ruído em tempo de execução.
Uma faixa de terceiros numa página pública é uma questão de licenciamento que
ninguém pediu, e que um mp3 não responde; gerar também custa zero byte de áudio.
A amplitude medida da malha caminha o corte do filtro da mistura, então o que
você vê e o que você ouve rodam do mesmo número.

**Duas saídas são obrigatórias.** Um campo de alto contraste em movimento
contínuo é risco de fotossensibilidade, então: sem WebGL cai num campo de barras
estático, e `prefers-reduced-motion` segura a malha resolvida porém parada. Há
também um controle visível de parada, porque nem todo mundo em risco configurou
a preferência do sistema — e ele se esconde quando não há WebGL, já que um botão
de parar um movimento que não pode acontecer é um controle que mente.

**A tela de boot protege a entrada.** A página tem um único momento de movimento
autoral: a malha se resolvendo a partir de um plano plano. Enquanto a tela de
boot está de pé essa entrada fica *presa* em zero, e é solta no mesmo instante
em que a cortina sobe.

## Rodando

```bash
npm install
```

```bash
npm run dev
```

`npm run build` escreve um site estático em `dist/`, e `npm run preview` o serve.

## Verificando

As afirmações acima são exercitadas, não declaradas. Suba um servidor e rode as
suítes contra ele:

```bash
npm run preview
```

```bash
npm run verify
```

| Script | O que prova |
|---|---|
| `verify:boot` | A cortina está de pé antes do primeiro paint e a página atrás dela é inerte; cada estágio reporta um valor medido, conferido contra o medidor do rail; a malha fica plana sob a cortina e resolve quando ela sobe. |
| `verify:features` | A lente do wordmark, o ticker que digita e seu bloco elástico, o reveal no hover dos controles em ícone e seus nomes acessíveis, os links de perfil. |
| `verify:exits` | Movimento reduzido segura o campo; sem WebGL a página ainda existe; o controle de parada realmente para. |
| `verify:theme` | Dark é o padrão, a preferência do sistema é ignorada, a escolha sobrevive a um reload — e o canvas WebGL inverte junto, lido dos pixels renderizados e não do DOM. |
| `verify:audio` | O loop toca, tem dinâmica, para quando pedido, e seu leito de ruído fica sob a música — medido por um analisador enfiado na frente do destino. |

`npm run capture` regenera as capturas de referência.

## Organização

```
src/
  components/    Boot, WaveField, Wordmark, Ticker, Landing
  scripts/       wave-field.ts (a malha), field-audio.ts (a trilha)
  styles/        global.css — tokens, o primitivo de label, a plate
  copy.ts        toda string que a página imprime
  site.config.ts contato e links de perfil
scripts/         suítes de verificação e o pipeline de captura
docs/            assets e notas para agentes
```

`src/copy.ts` é um módulo único, e não strings espalhadas pelos componentes, de
propósito: é o único lugar onde a regra permanente da página — que nada pode ser
escrito para preencher espaço, e nenhuma afirmação pode ser feita sem ter sido
fornecida — dá para ser garantida na leitura.

## Licença

© 2026 Fernando Filter. Todos os direitos reservados.

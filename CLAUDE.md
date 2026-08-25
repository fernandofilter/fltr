# fltr

Repositório novo — ainda sem código nem commits. Preencha as seções abaixo conforme o
projeto tomar forma; o que estiver desatualizado aqui atrapalha mais do que ajuda.

## Stack

_A definir._ Ao criar a primeira estrutura do projeto, registre aqui: linguagem, gerenciador
de pacotes, framework e alvo de execução.

## Comandos

_A definir._ Registre aqui os comandos reais do projeto (build, test, lint, dev) assim que
existirem, para que possam ser executados sem adivinhação.

## Convenções

- Mensagens de commit e nomes de branch em inglês; documentação interna e conversa
  em português.
- **Exceção — superfícies públicas em inglês.** O site é só em inglês (o i18n foi
  removido), e o `README.md` da raiz acompanha, com `README.pt-BR.md` ao lado. O
  GitHub só renderiza o README da raiz na página do repositório, e quem chega ali
  vem de uma landing em inglês. Editou um dos dois READMEs, edite o outro na mesma
  passada — eles não têm nenhum mecanismo que force a paridade.
- Não commitar `*.local.json` nem `.scratch/` (veja `.gitignore`).

## Agent skills

As skills ficam em `.claude/skills/`:

- **impeccable** — revisão e polimento de interface (design, acessibilidade, layout).
  Ativa hooks de checagem definidos em `.claude/settings.local.json`.
- **Skills do Matt Pocock** (`mattpocock/skills`) — fluxo de engenharia real: `tdd`,
  `implement`, `diagnosing-bugs`, `codebase-design`, `domain-modeling`, `research`,
  `to-spec`, `to-tickets`, `triage`, `wayfinder`, `handoff`, `grill-me`, entre outras.
  Comece por `/ask-matt` quando não souber qual usar.

### Issue tracker

Issues vivem no GitHub Issues de `fernandofilter/fltr`, operadas via `gh` CLI.
Ver `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão — cada label igual ao nome da role. Ver `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` na raiz + `docs/adr/`. Ver `docs/agents/domain.md`.

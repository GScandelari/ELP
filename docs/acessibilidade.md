# Acessibilidade (RNF-007)

Auditoria da Fase 6 (PR 6.7) — `docs/plano-fase-6.md` §7/§8.3: automatizada (`@axe-core/playwright`) + checklist manual dirigido, não só manual (decisão confirmada com o usuário).

## Automatizada — `@axe-core/playwright`

`e2e/helpers.ts` exporta `expectNoA11yViolations(page)`, que roda o axe-core na página atual e falha o teste listando cada violação (regra, impacto, elementos afetados) se houver alguma. Sem excluir nenhuma regra do axe.

Em vez de specs dedicados, a checagem entra como mais uma asserção dentro dos specs de E2E que já visitam cada tela — pega problema estrutural (contraste, label ausente, role incorreto, landmark ausente) sem duplicar setup. Cobertura:

| Tela | Spec |
|---|---|
| `/cadastro`, `/entrar`, `/painel` | `e2e/signup-login.spec.ts` |
| `/atividades` (repositório) + tela da atividade (Builder) | `e2e/atividades.spec.ts` |
| Preview do aluno (relacionamento de significados) | `e2e/atividades-relacionamento.spec.ts` |
| Tela de resolução — múltipla escolha / tradução | `resolveChoiceActivityAndVerifyScore` (`e2e/helpers.ts`, usado por `atividades-resolver-alternativa-certa.spec.ts`) |
| Tela de resolução — preencher espaços | `e2e/atividades-resolver-preencher-espacos.spec.ts` |
| Tela de resolução — relacionamento de significados | `e2e/atividades-resolver-relacionamento.spec.ts` |
| Sala do professor (vazia e com atividade atribuída) | `e2e/salas-professor.spec.ts`, `e2e/atividades-publicar.spec.ts` |
| Formulário "entrar em sala" (aluno) | `e2e/salas-aluno.spec.ts` |
| Tabela de resultados (professor) | `e2e/resultados-professor.spec.ts` |
| `/conta` (direitos do titular) | `e2e/conta-direitos-titular.spec.ts` |
| `/`, `/termos`, `/privacidade`, `/cookies`, `/termo-responsavel` (públicas, nenhum outro spec visita) | `e2e/acessibilidade.spec.ts` (spec novo, só pra essas) |

**O que o axe não pega:** ele analisa a árvore de acessibilidade estática de cada momento capturado, não a experiência real de navegar só de teclado (ordem de tabulação, foco visível ao longo de uma interação, ausência de armadilha de foco) nem o comportamento sob tema escuro (os specs rodam no tema padrão do Chromium headless, sem forçar `prefers-color-scheme: dark`) — daí o checklist manual abaixo.

### Achados corrigidos nesta PR

Rodar a suíte com os pontos acima achou 3 violações reais, todas corrigidas:

1. **`multiple-choice-renderer.tsx` / `translation-renderer.tsx`** — o `<input type="radio" disabled>` do preview somente-leitura (professor vendo "Mostrar conteúdo" antes de atribuir) não tinha nenhum label (nem implícito, nem `aria-label`) — regra `label`, impacto **crítico**. Corrigido com o mesmo padrão de `aria-label` que as versões interativas (`*-answerable.tsx`) já usavam: `` `${option} (questão ${index + 1})` ``.
2. **`meaning-matching-renderer.tsx`** — o `<select disabled>` do preview do aluno tinha o mesmo problema. Corrigido com `aria-label={\`Relacionar "${leftItem.left}" (questão ${index + 1})\`}`, espelhando `meaning-matching-answerable.tsx`.
3. **`/cadastro` e `/entrar`** — as duas únicas rotas fora dos grupos `(app)`/`(marketing)` (que já embrulham o conteúdo em `<main>`) renderizavam o formulário direto num `<div>`, sem nenhum landmark `<main>` na página — regras `landmark-one-main` e `region`, impacto moderado. Corrigido trocando o `<div>` de layout pelo `<main>` equivalente nas duas páginas.

## Checklist manual dirigido

### Teclado

- **Nenhum `onClick` em elemento não-interativo** (`div`/`span`) foi encontrado no código — toda ação clicável é um `<button>` real (via o componente `Button` do design system) ou um `<a>`/`Link`, o que já garante foco e ativação por teclado (Tab + Enter/Espaço) nativamente, sem handler de teclado customizado necessário.
- **Relacionamento de significados** (o exercício de maior risco per RNF-007/ADR-007, "especialmente nos exercícios de drag-and-drop"): a implementação final **não usa arrasta-e-solta** — decisão registrada no próprio `meaning-matching-renderer.tsx`/`meaning-matching-answerable.tsx` (§8.3 da Fase 3: clique/seleção em vez de DnD). O aluno responde por um `<select>` nativo por par, 100% navegável por teclado (seta pra escolher, Tab pra ir pro próximo) sem nenhum ARIA customizado — o risco mais alto do requisito acabou não existindo na prática.
- **Preencher espaços**: os "buracos" clicáveis do texto (`fill-in-blanks-item-dialog.tsx`) são `<button type="button">`, não `<span onClick>` — focáveis e ativáveis por teclado.
- Diálogos (`ui/dialog.tsx`) têm um botão "Fechar" com `aria-label` explícito.

### Contraste

Os tokens de cor (`apps/web/app/globals.css`) foram checados contra a fórmula de luminância relativa do WCAG 2.1 (§1.4.3, AA = 4.5:1 pra texto normal):

| Par | Claro | Escuro |
|---|---|---|
| `foreground` / `background` | 17.9:1 | 17.2:1 |
| `muted-foreground` / `background` (texto secundário) | 6.1:1 | 7.4:1 |
| `primary-foreground` / `primary` (texto de botão) | 8.0:1 | 4.9:1 |
| `text-red-600` / `background` (mensagem de erro, `role="alert"`) | 4.8:1 | — (mesma cor, fundo bem mais escuro no dark → contraste maior) |

Todos os pares ficam acima de 4.5:1 — a regra `color-contrast` do axe também passou nas 29 telas escaneadas em modo claro (o modo escuro não é exercitado pelos specs de E2E, mas os números acima confirmam a mesma paleta de tokens, só invertida, então o resultado se mantém).

### Labels e feedback textual

- Confirmado pelo axe (regra `label`) em toda tela escaneada — nenhum campo de formulário sem label associado (depois da correção dos 2 achados acima).
- Erros de formulário usam `role="alert"` (`/cadastro`, `/entrar`) — tecnologia assistiva anuncia a mensagem sem precisar de foco manual.
- Confirmações de sucesso ("Tentativa enviada.", "resultados liberados") usam `role="status"`.

## Não coberto nesta fase (pendência documentada)

- Teste real com leitor de tela (NVDA/VoiceOver) — fora do escopo de engenharia desta fase; item pra QA manual antes do go-live (Fase 7), junto da revisão jurídica dos textos legais já pendente em `docs/lgpd/README.md`.
- Tema escuro não tem cobertura automatizada própria (E2E não força `prefers-color-scheme: dark`) — os números de contraste acima foram calculados manualmente pra essa paleta e passam, mas não há uma regressão automática se a paleta mudar.

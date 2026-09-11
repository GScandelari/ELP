# Plano detalhado — Fase 3: Repositório de Atividades + Activity Engine

**Branch base:** `main` (Fase 2 fechada, PR #12) · **Referência:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) §6 (Fase 3) · [`SDD.md`](./SDD.md) RF-008 a RF-011, RN-006, RN-012, RN-013 · ADR-007, ADR-012, ADR-014

---

## 1. Objetivo e critério de saída

Entregar o **repositório de atividades do professor** (independente de sala), o **Activity Engine** (interface comum por tipo) para os 4 tipos do MVP, e a **atribuição de uma atividade a uma ou mais salas** — incluindo clonar/substituir uma atividade já em uso (ADR-014).

**Critério de saída** (do IMPLEMENTATION-PLAN): UC-004 e UC-005 completos; professor cria uma atividade de cada tipo, atribui a duas salas, clona uma atividade e substitui a atribuição numa sala sem tentativas.

**Fora de escopo desta fase** (IMPLEMENTATION-PLAN já separa em Fase 4): `createAttempt`, `submitAttempt`, salvar progresso, qualquer fluxo em que o **aluno responde** e envia. UC-006 (resolver atividade) não faz parte do critério de saída da Fase 3.

### 1.1 Escopo do "Renderer" nesta fase — decisão que muda o esforço

A IMPLEMENTATION-PLAN pede "Builder + Renderer" para os 4 tipos. Como `createAttempt`/`submitAttempt` não existem até a Fase 4, **não há onde persistir uma resposta do aluno ainda**. Proposta: nesta fase o Renderer é **só leitura** — usado (a) pelo professor para pré-visualizar a atividade que está montando, e (b) pelo aluno para ver o `contentSnapshot` de um assignment `PUBLISHED` na sua sala (sem campo de resposta, sem persistência). A versão **interativa** (captura de resposta, salvar progresso) é construída na Fase 4 junto com o backend que a recebe. Ver decisão a confirmar em §8.

---

## 2. Lição da Fase 2 aplicada de propósito nesta fase

A Fase 2 (PRs #7 e #8) revelou, testando de verdade contra o emulador, que **`list` no Firestore só prova uma regra quando ela bate exatamente com um filtro `where` da própria query, num campo de *dado* (`resource.data.x == request.auth.uid`)** — `get()`/`exists()` contra um documento (mesmo um ancestral fixo) e condições baseadas só no segmento do path (`{wildcard}`) já se mostraram capazes de fazer o emulador negar a query inteira com um erro genérico ("Null value error" / "Property X is undefined"), sem nenhum aviso claro de causa.

Como a Fase 3 introduz **duas coleções novas que o client vai listar** (`activities/{id}/items` e `classes/{classId}/assignments`), a regra prática adotada desde o início, em vez de descobrir de novo por tentativa e erro:

> **Toda coleção listada pelo client carrega um campo `accountId` denormalizado do professor dono, e a query de listagem sempre inclui `where('accountId', '==', uid)`.** A regra de `list` usa `resource.data.accountId == request.auth.uid` — nunca `get()`/`exists()` nem condição baseada só no path. Cada regra nova de `list` ganha um teste em `tests/rules/` **antes** da tela que a usa ser construída (PR 3.1).

---

## 3. Modelo de dados

Já esboçado em ADR-012/ADR-014 e no scaffold (`activities`, `items`, `assignments`, `assignmentKeys` já existem no `firestore.rules`/`firestore.indexes.json` desde a Fase 0/1, sem uso ainda). Esta fase preenche e ajusta:

```text
activities/{activityId}                         # repositório do professor
  accountId, title, description, type, difficulty, tags[],
  status (DRAFT | READY | LOCKED | ARCHIVED),
  locked, lockedAt, clonedFrom,
  itemCount,                                     # denormalizado — evita ler a subcoleção só pra saber se tem item (READY exige >= 1)
  createdAt, updatedAt

activities/{activityId}/items/{itemId}
  accountId,                                     # NOVO — denormalizado do dono, para a regra de list (ver §2)
  position, prompt, configuration, points
  # `configuration` tem o formato por tipo — ver §4

# NOVO — índice reverso p/ "em quais salas esta atividade está atribuída"
# (tela "Aplicar esta versão" do ADR-014, sem precisar de collection group)
activities/{activityId}/assignmentRefs/{classId}
  accountId,                                     # denormalizado, mesma regra
  classId, className, assignmentId,
  status (PUBLISHED | CLOSED), startedCount
  # mantido por publishAssignment (cria) e swapAssignmentActivity (atualiza);
  # startedCount sempre 0 nesta fase (createAttempt só existe na Fase 4) —
  # ver §7 sobre o que dá para testar de verdade agora

classes/{classId}/assignments/{assignmentId}
  accountId,                                     # NOVO — denormalizado do dono, para a regra de list (ver §2)
  activityId, activityTitle, type,
  contentSnapshot,                               # array embutido — ver §4, não é subcoleção
  status (PUBLISHED | CLOSED), position, publishedAt, dueDate,
  allowRetry, maxAttempts,                       # default maxAttempts = 1 (OPEN-QUESTIONS.md)
  startedCount, firstStartedAt,
  resultsPolicy (ON_TEACHER_RELEASE | ON_DUE_DATE | ON_CLOSE),
  resultsReleased, resultsReleasedAt,
  createdAt, updatedAt

assignmentKeys/{assignmentId}                    # gabarito — já é read/write:false, sem mudança de regra
  classId, accountId, gradingConfig[]            # array paralelo ao contentSnapshot, indexado por itemId
```

### 3.1 Por que `contentSnapshot` é um array embutido, não subcoleção

ADR-012 já aceita a duplicação de conteúdo por sala como custo tolerável no MVP. Ler o assignment inteiro (enunciado de todos os itens) numa única leitura evita N+1 no portal do aluno — e ele não precisa de paginação: atividades do MVP têm poucos itens (dezenas, não milhares). Se um dia pesar, o próprio ADR-012 já aponta a saída (`assignments/{id}/items` como subcoleção).

### 3.2 Índices novos (`firestore.indexes.json`)

`activities` (`accountId, status, updatedAt`) e `classes/{id}/assignments` (`status, position`) **já existem** desde o scaffold da Fase 0. Faltam:

- `items` (COLLECTION): `accountId ASC, position ASC` — listar os itens de uma atividade em ordem.
- `assignments` (COLLECTION): `accountId ASC, position ASC` — listar os assignments de uma sala (a query real também filtra `classId` implicitamente pelo path).
- `assignmentRefs` (COLLECTION): `accountId ASC` — listar em quais salas uma atividade está atribuída (não precisa de collection group — cada atividade tem a própria subcoleção).

---

## 4. Activity Engine — interface e schema por tipo

### 4.1 Interface comum (`functions/src/activity-types/`)

```ts
// types.ts
interface ActivityTypeHandler<TConfig, TAnswer> {
  validate(config: TConfig): void;               // lança HttpsError('invalid-argument', ...) — RN-006
  toStudentContent(config: TConfig): unknown;     // remove o gabarito — vira parte do contentSnapshot
  score(answer: TAnswer, gradingConfig: unknown): { isCorrect: boolean; pointsAwarded: number };
}
```

Registro num mapa `type -> handler` (`activity-types/index.ts`), usado por `publishAssignment`/`swapAssignmentActivity` (chamam `validate` + `toStudentContent`) e, na Fase 4, por `submitAttempt` (chama `score`). `score` é implementado **agora** (função pura, testável isoladamente) para a Fase 4 só reaproveitar — sem desenhar 4 algoritmos de correção sob pressão depois.

Sem contraparte no client: diferente do `enrollment-code.ts` (mirror simples), `validate`/`score` não são triviais o bastante pra valer duplicar com o padrão de comentário de sincronia. O Builder faz só checagem leve do lado do client (campos obrigatórios preenchidos); `publishAssignment` é a validação autoritativa (RN-006).

### 4.2 Schema de `configuration` por tipo — proposta concreta

| Tipo | `configuration` (autoria, em `items`) | `toStudentContent` (vai pro `contentSnapshot`) | `gradingConfig` (vai pro `assignmentKeys`) |
|---|---|---|---|
| `MULTIPLE_CHOICE` | `{ question, options: string[], correctIndex }` | `{ question, options }` (sem `correctIndex`) | `{ correctIndex }` |
| `FILL_IN_BLANKS` | `{ mode: 'TYPING'\|'WORD_BANK', text, blanks: [{id, answer, acceptedAnswers?}], wordBank?: string[] }` | `{ mode, text, blankIds: string[], wordBank? }` (sem `answer`) | `{ blanks: [{id, answer, acceptedAnswers}] }` |
| `TRANSLATION` | `{ mode: 'MULTIPLE_CHOICE'\|'INDEXING', source, options: string[], correctIndex }` | `{ mode, source, options }` | `{ correctIndex }` |
| `MEANING_MATCHING` | `{ pairs: [{id, left, right}] }` | `{ leftItems: [{id,left}], rightItems: [{id,right}] }` (embaralhados, sem o par) | `{ pairs: [{id,left,right}] }` |

Decisões de escopo já tomadas para caber no MVP:

- `TRANSLATION` no MVP cobre `MULTIPLE_CHOICE`/`INDEXING` (escolher a tradução certa); `DRAG_AND_DROP` citado na seção 9.3 do SDD como variação de UI da mesma resposta fica pra depois, se quiser — não muda o `configuration`.
- Nenhum tipo usa `weight`/peso (`OPEN-QUESTIONS.md`, já decidido).
- `points` (em `items`) é por item; sem pontuação parcial dentro de um item nesta fase (acertar ou errar o item inteiro) — mantém `score()` simples.

### 4.3 `FILL_IN_BLANKS` e `MEANING_MATCHING` — drag-and-drop (ADR-007)

ADR-007 exige alternativa acessível por teclado para qualquer modo `DRAG_AND_DROP`. Decisão a confirmar em §8: usar `@dnd-kit/core` já nesta fase para `MEANING_MATCHING`, ou entregar só o modo por clique/seleção (`WORD_BANK`/`INDEXING`-like) no MVP e deixar o arrastar visual pra depois — o `configuration` não muda, é só a interação no Renderer/Builder.

---

## 5. Backend — Cloud Functions

Novo diretório `functions/src/activities/` (paralelo a `functions/src/classes/`).

### 5.1 O que é escrita direta (client, protegida por rule) vs. callable

Ao contrário do que a IMPLEMENTATION-PLAN sugere ("handlers nas Cloud Functions" pode soar como tudo-callable), a maior parte do CRUD do repositório **não precisa de callable** — a rule de `activities`/`items` já existe desde a Fase 1 e cobre exatamente isso (dono + não-`LOCKED`):

| Operação | Como | Por quê |
|---|---|---|
| Criar/editar atividade (metadados), criar/editar/reordenar item | Escrita direta (`setDoc`/`updateDoc`) | Rule já valida dono + `locked == false`; sem transação entre documentos |
| `DRAFT ⇄ READY`, `→ ARCHIVED` | Escrita direta (`status`) | Idem; `READY` exige `itemCount >= 1`, checado no client (não é RN crítica — pior caso é uma atividade "pronta" vazia, sem risco de dado incorreto) |
| `publishAssignment` | **Callable** | Precisa validar RN-006 com o `validate()` do tipo, congelar `contentSnapshot` + `assignmentKeys` (gabarito nunca pode ser client-writable) |
| `cloneActivity` | **Callable** | Copia atômica de `activities/{id}` + subcoleção `items` inteira — client teria que ler tudo e escrever em lote; mais simples e seguro no servidor |
| `swapAssignmentActivity` | **Callable** | Mesma razão do publish (re-congela `contentSnapshot`/`assignmentKeys`) + checa `startedCount == 0` |
| Encerrar assignment (`PUBLISHED → CLOSED`) | Escrita direta (`status`) | RF-011 não tem validação além de "sou o dono"; já coberto pela rule de `assignments` |

### 5.2 `publishAssignment(classId, activityId, config)` — RF-011, RN-006, RN-012, UC-005

```
guard:  teacher, dono da activity E da sala (accountId == uid nos dois)
valida: activity.status == 'READY' (RF-011: só publica READY)
        activity.locked == false (RN-013 — LOCKED não vai pra sala nova)
        config: dueDate, maxAttempts (default 1), allowRetry, resultsPolicy — formato
        handler[activity.type].validate(item.configuration) para cada item (RN-006)
efeito: lê todos os items da activity
        contentSnapshot = items.map(i => handler.toStudentContent(i.configuration))
        gradingConfig   = items.map(i => handler.score-config correspondente)
        cria classes/{classId}/assignments/{novoId} = { ...contentSnapshot, status: PUBLISHED, ... }
        cria assignmentKeys/{novoId} = { classId, accountId, gradingConfig }
        upsert activities/{activityId}/assignmentRefs/{classId} = { assignmentId: novoId, status: PUBLISHED, startedCount: 0, ... }
saída:  { assignmentId }
```

Pode ser chamado várias vezes para salas diferentes (RN-012 — mesma atividade em N salas), um `assignmentId` novo por chamada.

### 5.3 `cloneActivity(activityId)` — RF-022, ADR-014 §3

```
guard:  teacher, dono da activity de origem
efeito: copia activities/{activityId} -> activities/{novoId}
          status: 'DRAFT', locked: false, lockedAt: null,
          clonedFrom: activityId, title: "{título} (v2)" (incrementa se já existir "(v2)")
        copia todos os items (mesmo accountId, novo activityId)
saída:  { activityId: novoId }
```

### 5.4 `swapAssignmentActivity(classId, assignmentId, sourceActivityId)` — ADR-014 §4

```
guard:  teacher, dono do assignment E da sourceActivity
valida: assignment.startedCount == 0 (senão failed-precondition — "esta sala já começou, não dá pra trocar")
efeito: handler[sourceActivity.type].validate(...) para cada item da sourceActivity (RN-006, de novo)
        re-congela contentSnapshot/assignmentKeys do assignment a partir da sourceActivity,
          MANTENDO dueDate, maxAttempts, allowRetry, resultsPolicy, position do assignment original
        atualiza activityId/activityTitle do assignment para a sourceActivity
        atualiza activities/{sourceActivityId}/assignmentRefs/{classId}
saída:  { ok: true }
```

### 5.5 Padrões a seguir

Mesmos de `functions/src/classes/`: `onCall` v2, `HttpsError` com mensagens em pt-BR, validação explícita antes de qualquer escrita, `FieldValue.serverTimestamp()`.

---

## 6. Security Rules

`activities`/`items` já existem (Fase 1); ajustes desta fase:

```diff
    match /activities/{activityId} {
      allow read: if hasRole('teacher') && resource.data.accountId == request.auth.uid;
      allow create: if hasRole('teacher')
        && request.resource.data.accountId == request.auth.uid
        && request.resource.data.get('locked', false) == false;
      allow update: if hasRole('teacher')
        && resource.data.accountId == request.auth.uid
        && resource.data.get('locked', false) == false;
-     allow delete: if hasRole('teacher') && resource.data.accountId == request.auth.uid;
+     allow delete: if hasRole('teacher')
+       && resource.data.accountId == request.auth.uid
+       && resource.data.get('locked', false) == false;   // fix: delete não checava lock

      match /items/{itemId} {
-       allow read: if hasRole('teacher')
-         && activityOf(activityId).accountId == request.auth.uid;
-       allow write: if hasRole('teacher')
-         && activityOf(activityId).accountId == request.auth.uid
-         && activityOf(activityId).get('locked', false) == false;
+       // resource.data.accountId direto (nao get()) - fix aplicado por precaucao
+       // (list de items de uma atividade): ver §2. accountId denormalizado em
+       // cada item por quem escreve (client, ou cloneActivity no servidor).
+       allow read: if hasRole('teacher') && resource.data.accountId == request.auth.uid;
+       allow write: if hasRole('teacher')
+         && resource.data.accountId == request.auth.uid
+         && activityOf(activityId).get('locked', false) == false;   // write ainda precisa do lock do PAI
+       allow create: if hasRole('teacher')
+         && request.resource.data.accountId == request.auth.uid
+         && activityOf(activityId).get('locked', false) == false;

      match /assignmentRefs/{classId} {
        allow read: if hasRole('teacher') && resource.data.accountId == request.auth.uid;
        allow write: if false;   // só publishAssignment/swapAssignmentActivity (Cloud Function)
      }
    }

    match /classes/{classId} {
      ...
      match /assignments/{assignmentId} {
-       allow read: if isAccountOwner(classId)
-         || (isEnrolledStudent(classId) && resource.data.status == 'PUBLISHED');
-       allow write: if isAccountOwner(classId);
+       allow get: if isAccountOwner(classId)
+         || (isEnrolledStudent(classId) && resource.data.status == 'PUBLISHED');
+       allow list: if isSignedIn() && resource.data.accountId == request.auth.uid;  // só professor lista; aluno lê 1 a 1 (get)
+       allow update: if isAccountOwner(classId)
+         && request.resource.data.accountId == resource.data.accountId
+         && request.resource.data.activityId == resource.data.activityId  // trava fora do swapAssignmentActivity (Admin SDK)
+         && request.resource.data.contentSnapshot == resource.data.contentSnapshot;
+       allow create, delete: if false;   // só publishAssignment (Cloud Function)
      }
```

Pontos que exigem atenção extra na implementação (não só copiar o diff acima):

- **`write` de `items` precisa tanto do `resource.data.accountId` (proprio item, prova o `list`) quanto do `activityOf(activityId).get('locked', ...)` (estado do PAI, só existe no item pai — não dá pra denormalizar `locked` no item sem duplicar uma escrita toda vez que a atividade trava).** Isso é uma combinação `resource.data` + `get()` na MESMA regra — testar explicitamente que `write` (get/set único, não list) ainda funciona com essa combinação (deve funcionar; o problema da Fase 2 foi especificamente em `list`, não em operações de documento único).
- **Aluno lê assignment por `get` (não `list`)** — o portal do aluno abre uma atividade específica a partir do link/card, não precisa listar todos os assignments PUBLISHED de todas as salas de uma vez (ele já lista as PRÓPRIAS salas via `watchMyClasses`, Fase 2; dentro de uma sala, lista os assignments dessa sala — isso é uma LISTA do professor, não do aluno, olhando de novo a tabela acima). Se a Fase 4 precisar que o aluno LISTE os assignments PUBLISHED da própria sala (provável, pra mostrar "atividades desta turma"), essa regra de `list` do aluno **ainda não está coberta** aqui — fica registrado como pendência pra abrir quando a tela existir (mesmo padrão: `resource.data` + `where` batendo).

### 6.1 Casos de teste de Rules (`tests/rules/`, novo arquivo `activities.rules.test.ts`)

| # | Cenário | Esperado |
|---|---|---|
| 1 | professor lê/lista a própria atividade | ✅ |
| 2 | professor lista atividades filtrando por `accountId` próprio | ✅ (regressão do padrão §2) |
| 3 | outro professor não lê nem lista | ❌ |
| 4 | professor cria/edita atividade `locked: false` | ✅ |
| 5 | professor não edita/deleta atividade `locked: true` | ❌ |
| 6 | professor lista os itens da própria atividade (`list`) | ✅ (regressão do padrão §2) |
| 7 | professor escreve item de atividade não travada | ✅ |
| 8 | professor não escreve item de atividade travada | ❌ |
| 9 | professor lista os assignments da própria sala (`list`) | ✅ (regressão do padrão §2) |
| 10 | outro professor não consegue listar filtrando pelo `accountId` do dono real | ❌ (mesmo teste de "espiar" da Fase 2) |
| 11 | aluno inscrito lê (`get`) um assignment `PUBLISHED` da própria sala | ✅ |
| 12 | aluno não lê assignment `CLOSED`... espera, `CLOSED` também deveria ser legível (já foi publicado) — **ajustar**: aluno lê qualquer assignment que não seja rascunho, i.e. `status in ['PUBLISHED','CLOSED']` | ✅/❌ conforme ajuste |
| 13 | client não cria/deleta assignment diretamente | ❌ |
| 14 | client não lê/escreve `assignmentKeys` | ❌ (já coberto, sem mudança — teste de regressão) |
| 15 | professor lê `assignmentRefs` da própria atividade | ✅ |
| 16 | client não escreve `assignmentRefs` | ❌ |

> Nota no item 12: a tabela de rules do diff acima só libera leitura de `status == 'PUBLISHED'` pro aluno — mas um assignment `CLOSED` já foi visto pelo aluno antes de fechar e ele plausivelmente ainda precisa ver o enunciado (resultado, revisão). Decidir ao implementar: `resource.data.status in ['PUBLISHED', 'CLOSED']` no lugar de `== 'PUBLISHED'`.

---

## 7. O que dá (e o que não dá) para testar de verdade nesta fase

Como `createAttempt` só existe na Fase 4, **nada nesta fase incrementa `startedCount` de verdade nem trava uma atividade organicamente**. Consequências para os testes:

- `swapAssignmentActivity` recusando por `startedCount > 0`: só testável **semeando** o campo manualmente em Firestore (integração de Functions), não via E2E — não existe fluxo de UI que gere isso ainda.
- A tela "Aplicar esta versão" (ADR-014 §7, agrupando salas por elegibilidade) sempre vai mostrar "todas elegíveis" em qualquer demo real desta fase — o agrupamento "salas com tentativa iniciada" só aparece de verdade na Fase 4 em diante. Construir a tela mesmo assim (ela é necessária), mas não fingir um E2E que prove o caminho "bloqueado" sem semear dado direto no banco.
- O aviso de UI "esta atividade vai travar ao ser iniciada" (ADR-014 §7) é conteúdo estático nesta fase — não há nada que dispare o lock de verdade para validar contra.

---

## 8. Decisões a confirmar

1. **Renderer nesta fase = só leitura** (preview do professor + visualização do aluno, sem captura de resposta) — a versão interativa entra na Fase 4 junto do backend que a recebe (§1.1).
2. **Ordem dos 4 tipos:** `MULTIPLE_CHOICE` → `FILL_IN_BLANKS` → `TRANSLATION` → `MEANING_MATCHING`, do mais simples (valida o Engine de ponta a ponta rápido) pro mais complexo (drag-and-drop).
3. **Drag-and-drop do `MEANING_MATCHING`:** usar `@dnd-kit/core` (ADR-007) já nesta fase, ou entregar só o modo por clique/seleção no MVP e deixar o arrastar visual pra depois? O `configuration` não muda; é só a interação.
4. **Exclusão de atividade:** sem exclusão física no MVP — só `ARCHIVED` (soft, RF não pede "excluir"). A rule de `delete` existente (sem checar `locked`) é corrigida (§6) mas a UI não expõe um botão "excluir", só "arquivar".

---

## 9. Quebra em PRs

| PR | Título | Entrega |
|---|---|---|
| **3.1** | `feat(activities): fundação — rules, índices, interface do engine` | Fix das rules de `items`/`assignments`/`delete` (§6); índices novos (§3.2); `activity-types/types.ts` (interface, sem implementação); testes de rules #1–#16 (com dado semeado manualmente, sem UI ainda) |
| **3.2** | `feat(web): repositório de atividades — metadados` | `/atividades` (lista + criar + editar metadados: título, descrição, dificuldade, tags); máquina de estado DRAFT⇄READY→ARCHIVED; sem itens ainda |
| **3.3** | `feat(activities): tipo Multiple Choice` | Handler completo (`validate`/`toStudentContent`/`score`, testado isoladamente); Builder (adicionar/editar/reordenar questões) + preview read-only |
| **3.4** | `feat(activities): tipo Fill in the Blanks` | Idem, modos `TYPING`/`WORD_BANK` |
| **3.5** | `feat(activities): tipo Translation/Localization` | Idem, modos `MULTIPLE_CHOICE`/`INDEXING` |
| **3.6** | `feat(activities): tipo Meaning Matching` | Idem + interação de pareamento (drag-and-drop ou clique, conforme decisão §8.3) |
| **3.7** | `feat(activities): publishAssignment — atribuir a sala` | Callable (§5.2); tela "Atribuir a sala(s)" a partir de uma atividade `READY`; lista de assignments na sala (`/salas/[classId]`, reaproveitando a estrutura da Fase 2) |
| **3.8** | `feat(activities): cloneActivity + swapAssignmentActivity` | Callables (§5.3/5.4); tela "Aplicar esta versão" (ADR-014 §7); `assignmentRefs` |
| **3.9** | `feat(activities): encerrar assignment + E2E + fecha a Fase 3` | `CLOSED` (escrita direta); E2E: criar atividade de cada tipo → atribuir a 2 salas → clonar → substituir numa sala; `IMPLEMENTATION-PLAN.md` marcado ✅ |

Ordem sequencial (3.1 é pré-requisito de tudo; 3.3–3.6 podem ser reordenados entre si conforme §8.2; 3.7 precisa de pelo menos um tipo pronto — 3.3 já basta pra desenvolver 3.7 em paralelo se quiser adiantar).

---

## 10. Riscos

- **Maior risco: repetir o ciclo "constrói a tela → `list` falha → depura regra" da Fase 2**, mesmo com a lição documentada em §2 — mitigado escrevendo o teste de rules ANTES da tela (PR 3.1 sai na frente das telas que dependem dela).
- **Escopo do Renderer mal-entendido** (interativo demais, adiantando trabalho da Fase 4 sem backend pra receber) — mitigado pela decisão explícita em §1.1/§8.1.
- **4 tipos × Builder + Engine é o maior volume de UI nova do MVP até aqui** — cada tipo em PR isolado (3.3–3.6) evita uma PR gigante difícil de revisar; o primeiro tipo (Multiple Choice) paga o custo de descobrir problemas de infra do Engine, os outros 3 devem ser mais rápidos.
- **`contentSnapshot`/`assignmentKeys` divergirem entre si** (um tipo lista um item no snapshot mas esquece o gradingConfig correspondente, ou vice-versa) — mitigado gerando os dois na MESMA chamada de `handler` dentro de `publishAssignment`/`swapAssignmentActivity`, nunca em passos separados.

---

## 11. Checklist de conclusão da fase

- [ ] `activity-types` (interface + 4 handlers) implementados e testados isoladamente
- [ ] Rules de `items`/`assignments`/`assignmentRefs` atualizadas + tabela §6.1 verde
- [ ] Índices novos adicionados
- [ ] Repositório de atividades navegável (criar, editar metadados, arquivar) para os 4 tipos
- [ ] `publishAssignment` funcionando para os 4 tipos, para múltiplas salas
- [ ] `cloneActivity` + `swapAssignmentActivity` funcionando (com `startedCount == 0` semeado em teste de integração)
- [ ] E2E: atividade de cada tipo → atribuir a 2 salas → clonar → substituir numa sala sem tentativas
- [ ] `docs/IMPLEMENTATION-PLAN.md` — Fase 3 marcada como ✅

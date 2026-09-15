# Plano detalhado — Fase 4: Execução e Avaliação (Attempts)

**Branch base:** `main` (Fase 3 fechada, PR #22) · **Referência:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) §6 (Fase 4) · [`SDD.md`](./SDD.md) RF-012 a RF-018, RN-005, RN-007 a RN-011, RN-013 · ADR-006, ADR-013, ADR-014

---

## 1. Objetivo e critério de saída

Entregar o fluxo completo do **aluno resolvendo uma atividade**: iniciar tentativa, responder, salvar progresso, enviar, receber confirmação — e a **liberação controlada de resultados** pelo professor (ADR-013). Esta fase também aciona, pela primeira vez de verdade, o `locked`/`LOCKED` das atividades (RN-013, ADR-014) que a Fase 3 só preparou.

**Critério de saída** (do IMPLEMENTATION-PLAN): UC-006 completo; fluxo E2E "aluno resolve → submete → (professor libera) → aluno vê nota"; antes da liberação, nota e gabarito não trafegam para o aluno **nem via Firestore direto**.

**Fora de escopo desta fase** (fica para a Fase 5): dashboard de acompanhamento do professor por sala/atividade/aluno (RF-018/UC-007), agregação em `resultsSummary`. O professor nesta fase só tem uma ação mínima — liberar resultados — sem tela de análise.

---

## 2. O achado mais importante desta fase — antes de escrever qualquer linha

O schema documentado no SDD (§7.6/7.7) põe `score`/`max_score` direto em `Attempt` e `is_correct`/`points_awarded`/`feedback` direto em `Answer`. As **rules já existentes** desde a Fase 0 (nunca testadas de verdade, porque nada as exercitava) liberam a leitura do `attempts/{id}` próprio e de `attempts/{id}/answers/{itemId}` próprio **sem checar `resultsReleased`**:

```
match /attempts/{attemptId} {
  allow read: if isSignedIn() && (resource.data.studentId == request.auth.uid || isAccountOwner(...));
  ...
  match /answers/{itemId} {
    allow read: if isSignedIn() && (attemptOf(attemptId).studentId == request.auth.uid || ...);
```

Se eu implementar literalmente o schema do SDD em cima dessas rules, o aluno lê a própria nota e o próprio gabarito **assim que a Cloud Function grava**, independente de `resultsReleased` — violando RN-011/ADR-013 direto pelo Firestore, sem precisar nem de bug de UI. Isso não é um detalhe de implementação, é o requisito central da fase falhando silenciosamente.

Firestore não tem leitura por campo — só por documento. Duas famílias de solução:

1. **Gate no próprio documento** (ex.: `allow read` do attempt inteiro exige `resultsReleased == true` depois de `GRADED`): quebra a tela "tentativa enviada, aguardando liberação" (RF-017), que precisa ler o attempt mesmo sem nota.
2. **Separar "o que aconteceu" de "quanto tirei"** em dois documentos, cada um com sua regra — escolhida.

### Decisão: nova coleção `attemptResults`, separada de `attempts`

```text
attempts/{attemptId}                    # sempre legível pelo dono (SEM nota)
  assignmentId, classId, activityId, studentId, attemptNumber
  status (IN_PROGRESS | GRADED)         # ver §3.1 sobre SUBMITTED
  startedAt, submittedAt

attempts/{attemptId}/answers/{itemId}   # o que o aluno respondeu — SEM correção
  answerPayload

attemptResults/{attemptId}              # NOVA — só a "nota", com regra própria
  studentId, classId, assignmentId
  score, maxScore
  items: [{ itemId, isCorrect, pointsAwarded }]
  gradedAt
```

Regra de `attemptResults` (só `get` por id conhecido — sem `list` nesta fase, ver §8.1):

```
allow get: if isSignedIn() && (
  (resource.data.studentId == request.auth.uid &&
   get(/databases/$(database)/documents/classes/$(resource.data.classId)/assignments/$(resource.data.assignmentId)).data.resultsReleased == true)
  || isAccountOwner(resource.data.classId)
);
allow list: if false;
allow write: if false;  // só submitAttempt (Admin SDK)
```

`get()` contra um documento fixo (o assignment) numa regra de **`get`** (não `list`) é seguro — a lição da Fase 2/3 (§2 do `plano-fase-3.md`) é especificamente sobre `list`/collection group, não sobre operação de documento único. Sem `list` nesta fase, não preciso denormalizar `resultsReleased` em cada `attemptResults` nem fazer `releaseAssignmentResults` reescrever N documentos — é um único `update` no assignment. Se um dia quiser uma tela "meu histórico de notas" (lista agregada), aí sim entra a denormalização — registrado como extensão futura, não construído agora.

**Consequência prática:** o Activity Engine já devolve exatamente essa separação — `score()` do handler retorna `{isCorrect, pointsAwarded}` por item (formato de `attemptResults.items[]`), nunca grava no documento que o aluno já pode ler. Nenhuma mudança no `ActivityTypeHandler` (interface já pronta desde a Fase 3).

---

## 3. Modelo de dados — completo

### 3.1 Máquina de estados do `Attempt`

O SDD desenha `IN_PROGRESS → SUBMITTED → GRADED` como duas transições. Os 4 tipos do MVP são **todos objetivos/auto-corrigidos** (RF-015) — a correção acontece na mesma chamada do envio, sem janela real de "enviado mas não corrigido". `submitAttempt` grava `status: 'GRADED'` diretamente (com `submittedAt` preenchido no mesmo instante) — `SUBMITTED` fica como valor de enum documentado para futuro (RF-016, correção manual, fora do MVP) mas nunca é um estado observável nesta fase.

### 3.2 `createAttempt` decide "criar ou recuperar" (UC-006 passo 3)

```
attempts/{attemptId}
  assignmentId, classId, activityId, studentId
  attemptNumber           # 1, 2, 3... por (studentId, assignmentId) — RN-007
  status: IN_PROGRESS | GRADED
  startedAt, submittedAt (null até enviar)
```

Índices já existentes desde a Fase 0 cobrem exatamente o necessário — nenhum índice novo:
- `attempts` (`studentId ASC, assignmentId ASC`) — aluno lista as próprias tentativas desta atribuição (decidir se recupera uma `IN_PROGRESS` ou se já bateu `maxAttempts`).
- `attempts` (`assignmentId ASC, status ASC`) / (`classId ASC, status ASC`) — uso do professor/Fase 5.

### 3.3 Trava da atividade na primeira tentativa (RN-013, ADR-014 — finalmente acionado)

`createAttempt`, ao criar (não ao recuperar) uma tentativa, faz **na mesma transação**:
- incrementa `assignment.startedCount` (grava `firstStartedAt` se for a primeira);
- se `activities/{activityId}.locked == false`: seta `locked: true`, `status: 'LOCKED'`, `lockedAt: now`.

Isso é 100% Admin SDK (Cloud Function) — a rule de `activities` já proíbe o client de setar `status: 'LOCKED'` direto (testado na Fase 3, PR 3.1). Nenhuma mudança de rule aqui, só a implementação que finalmente escreve nesse campo.

---

## 4. Backend — Cloud Functions (`functions/src/attempts/`)

### 4.1 `createAttempt(assignmentId)`

```
guard:  student
valida: assignment existe, status == 'PUBLISHED' (RN-005), aluno inscrito na sala do assignment
efeito: busca attempts do aluno para este assignment
        se existe um IN_PROGRESS -> devolve ele (retomar, UC-006 passo 3)
        senão, conta os não-IN_PROGRESS; se >= assignment.maxAttempts -> failed-precondition (RN-007)
        senão cria attempts/{novo} (IN_PROGRESS) + transação de lock (§3.3)
saída:  { attemptId, status }
```

### 4.2 `submitAttempt(attemptId, answers)`

```
guard:  student, dono do attempt, attempt.status == 'IN_PROGRESS'
efeito: lê assignmentKeys/{assignmentId}.gradingConfig (Admin SDK, nunca client)
        handler = getActivityTypeHandler(assignment.type)
        para cada item: handler.score(answers[itemId], item.grading, item.points) -> {isCorrect, pointsAwarded}
        grava attempts/{id}.answers/{itemId} = { answerPayload } (SEM correção — ver §2)
        grava attemptResults/{id} = { studentId, classId, assignmentId, score, maxScore, items[], gradedAt }
        atualiza attempts/{id}: status='GRADED', submittedAt=now
saída:  { status: 'GRADED', resultsReleased }
        — se resultsReleased já for true (ex.: ON_CLOSE previamente liberado), inclui score/maxScore
          direto na resposta, poupando uma 2ª leitura; senão, payload mínimo (RN-011/ADR-013)
```

### 4.3 `releaseAssignmentResults(classId, assignmentId)`

```
guard:  teacher, dono da sala/assignment
efeito: update assignments/{id}: resultsReleased=true, resultsReleasedAt=now
saída:  { ok: true }
```

Escrita única (sem fan-out — ver §2). `closeAssignment` (PR 3.9, já existe) ganha um ajuste de uma linha: se `resultsPolicy === 'ON_CLOSE'`, o mesmo `updateDoc` que fecha o assignment já seta `resultsReleased: true` — sem precisar de Cloud Function nova para essa política.

### 4.4 `releaseResultsOnDueDate` (scheduled, `ON_DUE_DATE`)

Roda periodicamente (ex.: a cada hora — mesma cadência do agendador que já existe para `purgeExpiredData`, ADR-011): busca `assignments` com `resultsPolicy == 'ON_DUE_DATE' && resultsReleased == false && dueDate <= now` e libera cada um.

---

## 5. Security Rules — diff

```diff
    match /attempts/{attemptId} {
-     allow read: if isSignedIn() && (...)
+     // sem score/maxScore no documento (ver §2) — leitura já é segura como estava
      allow read: if isSignedIn() && (
        resource.data.studentId == request.auth.uid
        || isAccountOwner(resource.data.classId)  // já usava get() em resource.data.classId - ok, e' get() de documento unico
      );
      allow create, update, delete: if false;  // createAttempt/submitAttempt (Cloud Function)

      match /answers/{itemId} {
-       // já sem isCorrect/pointsAwarded/feedback no payload (ver §2)
        allow read: if isSignedIn() && (...)      // inalterado
        allow write: if isSignedIn() && attemptOf(attemptId).studentId == request.auth.uid
          && attemptOf(attemptId).get('status', '') == 'IN_PROGRESS';  // inalterado
      }
    }

+   // NOVA colecao (§2) - a "nota", separada do "o que aconteceu"
+   match /attemptResults/{attemptId} {
+     allow get: if isSignedIn() && (
+       (resource.data.studentId == request.auth.uid &&
+        get(/databases/$(database)/documents/classes/$(resource.data.classId)/assignments/$(resource.data.assignmentId)).data.resultsReleased == true)
+       || isAccountOwner(resource.data.classId)
+     );
+     allow list: if false;   // sem tela de historico agregado nesta fase (ver §2)
+     allow write: if false;  // so submitAttempt (Cloud Function)
+   }
```

`classes/{classId}/assignments/{assignmentId}` já tem `update` liberado ao dono sem restringir quais campos de status mudam (PR 3.9) — `releaseAssignmentResults` como Cloud Function ainda é a escolha certa (não escrita direta) porque `resultsReleasedAt` idealmente é `serverTimestamp()` consistente e porque mantém o padrão "ação que muda uma política sensível passa por function", mas nada nas rules impede reconsiderar se quiser simplificar depois.

### 5.1 Casos de teste de Rules (`tests/rules/`, novo arquivo `attempts.rules.test.ts`)

| # | Cenário | Esperado |
|---|---|---|
| 1 | aluno lê a própria tentativa (`get`) | ✅ |
| 2 | aluno lista as próprias tentativas de um assignment (`list`, regressão do padrão §2 da Fase 3) | ✅ |
| 3 | outro aluno não lê/lista a tentativa | ❌ |
| 4 | professor (dono da sala) lê a tentativa de um aluno da sua sala | ✅ |
| 5 | professor de outra sala não lê | ❌ |
| 6 | client não cria/edita/deleta `attempts` direto (só Cloud Function) | ❌ |
| 7 | aluno dono escreve `answers` enquanto `IN_PROGRESS` | ✅ |
| 8 | aluno dono não escreve `answers` depois de `GRADED` | ❌ |
| 9 | aluno lê `attemptResults` da própria tentativa quando `resultsReleased == true` | ✅ |
| 10 | aluno **não** lê `attemptResults` da própria tentativa quando `resultsReleased == false` | ❌ (o teste central da fase) |
| 11 | professor lê `attemptResults` de qualquer aluno da sua sala, mesmo sem liberar | ✅ (RN-010) |
| 12 | outro professor não lê `attemptResults` | ❌ |
| 13 | client não escreve `attemptResults` (só Cloud Function) | ❌ |
| 14 | client não lista `attemptResults` (sem tela de histórico nesta fase) | ❌ |

---

## 6. Frontend

### 6.1 Portal do aluno — construído do zero nesta fase

A Fase 2 só entregou "minhas salas" (lista) para o aluno — `StudentClassCard` nem é um link. Não existe nenhuma tela de sala nem de atividade do lado do aluno ainda. Esta fase constrói:

- `/salas/[classId]` (aluno): a mesma rota da Fase 3, mas com branch por papel — professor vê o que já existe; aluno vê a lista de assignments `PUBLISHED`/`CLOSED` da sala (reaproveita `watchClassAssignments`, ajustado pra também servir o aluno — ver §6.3 sobre a regra de `list`).
- `/salas/[classId]/atividades/[assignmentId]` (aluno): tela de resolução — Renderer **interativo** do tipo (§6.2), botão salvar progresso automático, botão enviar, confirmação.
- Tela de resultado: mesma rota, após `GRADED` — mostra "enviado, aguardando liberação" ou nota+gabarito+feedback conforme `resultsReleased` (RF-017).

### 6.2 Renderers viram interativos — reaproveitando os 4 já construídos

Os 4 Renderers da Fase 3 (`MultipleChoiceRenderer`, `FillInBlanksRenderer`, `TranslationRenderer`, `MeaningMatchingRenderer`) são **somente leitura de propósito** (decisão §1.1 do plano da Fase 3). Nesta fase cada um ganha uma contraparte interativa (`*Answerable` ou prop `onAnswerChange` no mesmo componente — decidir ao implementar, provavelmente um componente irmão pra não colidir com o uso read-only que a pré-visualização do professor ainda usa) que:
- mantém o estado da resposta corrente (controlado pelo componente pai, que persiste via "salvar progresso");
- desabilita após envio;
- não precisa saber nada de correção — só captura `TAnswer` no formato que `score()` do handler espera (interfaces já existem desde a Fase 3).

### 6.3 Regra de `list` que a Fase 3 deixou registrada como pendência

`docs/plano-fase-3.md` §6 já registrou: *"Se a Fase 4 precisar que o aluno LISTE os assignments PUBLISHED da própria sala [...], essa regra de list do aluno ainda não está coberta."* É exatamente o que a tela de §6.1 precisa. Fix necessário:

```diff
    match /classes/{classId}/assignments/{assignmentId} {
      allow get: if isAccountOwner(classId) || (isEnrolledStudent(classId) && resource.data.status in ['PUBLISHED', 'CLOSED']);
-     allow list: if isSignedIn() && resource.data.accountId == request.auth.uid;
+     allow list: if isSignedIn() && (
+       resource.data.accountId == request.auth.uid ||
+       (isEnrolledStudent(classId) && resource.data.status in ['PUBLISHED', 'CLOSED'])
+     );
```

Precisa de teste de rules próprio (regressão do padrão de `list` — a condição do aluno bate com `resource.data.status`, que é campo de dado, então prova a query com `where('status','in',[...])`).

---

## 7. O que dá (e o que não dá) para testar de verdade

- `ON_DUE_DATE`/`ON_CLOSE` como gatilho de liberação: testável via integração de Functions (semeando `dueDate` no passado, ou chamando `closeAssignment`), não via E2E de UI (não dá pra esperar um prazo passar de verdade num teste).
- `maxAttempts` esgotado: testável via integração (semeando `attempts` direto) — um E2E que exaurisse tentativas de verdade seria lento e frágil; um teste com `maxAttempts: 1` é viável e barato o suficiente pra manter em E2E.
- Igual à Fase 3 (§7 do `plano-fase-3.md`): sempre que uma regra depender de estado que só uma Cloud Function ainda-não-existente geraria, semear direto no emulador em vez de fingir um caminho de UI que não existe.

---

## 8. Decisões — confirmadas

1. ✅ **`resultsPolicy` exposto no formulário de atribuição já nesta fase** — as 3 opções (`ON_TEACHER_RELEASE`/`ON_DUE_DATE`/`ON_CLOSE`) ficam selecionáveis; `ON_DUE_DATE` usa a function agendada (§4.4), `ON_CLOSE` usa o ajuste de uma linha no `closeAssignment` (§4.3).
2. ✅ **"Salvar progresso" (RF-013) a cada resposta alterada**, com debounce curto (~800ms) antes de escrever em `answers/{itemId}` — prioriza não perder resposta sobre custo de escrita (volume baixo no MVP).
3. ✅ **Uma PR por tipo para a interatividade do Renderer** (PRs 4.3–4.6), mesmo padrão da Fase 3.
4. ✅ **Professor só ganha "Liberar resultados" nesta fase** — sem lista de tentativas nem qualquer agregação; isso é 100% escopo da Fase 5 (RF-018/UC-007).

---

## 9. Quebra em PRs (proposta, sujeita ao item 3 acima)

| PR | Título | Entrega |
|---|---|---|
| **4.1** | `feat(attempts): fundação — rules, attemptResults, createAttempt` | Rules de `attempts`/`answers`/`attemptResults` + fix do `list` de `assignments` do aluno (§6.3); `createAttempt` (callable) com criar-ou-recuperar + trava da atividade (§3.3); testes de rules #1–14 e integração |
| **4.2** | `feat(attempts): submitAttempt + liberação de resultados` | `submitAttempt` (callable); `releaseAssignmentResults` (callable) + ajuste no `closeAssignment` pra `ON_CLOSE`; `releaseResultsOnDueDate` (scheduled); `resultsPolicy` exposto no `PublishAssignmentDialog` (decisão 1) |
| **4.3–4.6** *(ou 4.3 única, conforme decisão 3)* | `feat(attempts): resolução interativa — {tipo}` | Renderer interativo por tipo, reaproveitando os 4 componentes read-only da Fase 3 |
| **4.7** | `feat(web): portal do aluno — sala e atividade` | `/salas/[classId]` com branch por papel; lista de assignments do aluno; tela de resolução ligando os Renderers interativos a `createAttempt`/salvar progresso/`submitAttempt` |
| **4.8** | `feat(web): resultado do aluno + liberar resultados (professor)` | Tela de resultado condicionada a `resultsReleased`; botão "Liberar resultados" na `AssignmentList` do professor |
| **4.9** | `feat(attempts): E2E completo + fecha a Fase 4` | E2E: aluno resolve → envia → (professor libera) → aluno vê nota; `IMPLEMENTATION-PLAN.md` marcado ✅ |

Ordem sequencial: 4.1 é pré-requisito de tudo; 4.2 antes de 4.7/4.8 (a tela do aluno precisa de `submitAttempt` pronto pra ligar o botão enviar); 4.3–4.6 podem andar em paralelo a 4.2 (só dependem do Renderer read-only já existente); 4.9 fecha depois de tudo.

---

## 10. Riscos

- **O achado do §2 é o risco central da fase** — se a separação `attempts`/`attemptResults` não for feita antes de qualquer UI, o vazamento de nota é o tipo de bug que passa despercebido em teste manual superficial (o professor testando vê a nota liberada de propósito) e só aparece testando a régua de regras contra um caso concreto de "não liberado". Mitigado escrevendo o teste de rules #10 **antes** da tela que o exercitaria.
- **Renderer interativo × read-only coexistindo** — precisa decidir cedo (PR 4.1 ou já no design de cada PR 4.3–4.6) se é um componente novo por tipo ou uma prop `mode: 'preview' | 'answer'` no mesmo componente; misturar os dois sem decidir gera duplicação ou uma API confusa. Ver decisão 3.
- **`createAttempt` mexe em duas coisas sensíveis na mesma transação** (contador do assignment + lock da atividade) — mesmo padrão de cuidado que `publishAssignment`/`swapAssignmentActivity` já usaram (Fase 3): nunca em passos separados, sempre a mesma transação/batch.

---

## 11. Checklist de conclusão da fase

- [ ] `attemptResults` (rules + `submitAttempt`) garantindo que nota/gabarito não vazam antes da liberação — testado por rules, não só por UI
- [ ] `createAttempt` funcionando (criar, retomar, recusar por `maxAttempts`) e travando a atividade na primeira tentativa
- [ ] `submitAttempt` corrigindo os 4 tipos via `score()` do Activity Engine
- [ ] `releaseAssignmentResults` + política de liberação (pelo menos `ON_TEACHER_RELEASE`; `ON_DUE_DATE`/`ON_CLOSE` conforme decisão 1)
- [ ] Portal do aluno: sala → atividade → resolver → enviar → resultado
- [ ] E2E: aluno resolve → envia → (professor libera) → aluno vê nota
- [ ] `docs/IMPLEMENTATION-PLAN.md` — Fase 4 marcada como ✅

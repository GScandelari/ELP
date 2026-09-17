# Plano detalhado — Fase 5: Analytics / Resultados do professor

**Branch base:** `main` (Fase 4 fechada, PR #29) · **Referência:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) §6 (Fase 5) · [`SDD.md`](./SDD.md) RF-018, RN-010, UC-007

---

## 1. Objetivo e critério de saída

Entregar o **dashboard de acompanhamento do professor**: visualizar os resultados da turma por sala, por aluno e por atividade, sem precisar liberar resultados aos alunos primeiro (RN-010) e sem ler todos os `attempts`/`attemptResults` no client (custo/latência, N+1 reads).

**Critério de saída** (do IMPLEMENTATION-PLAN): UC-007 completo sem necessidade de ler todos os `attempts` no client.

**Fora de escopo desta fase** (fica para depois): peso por atividade (`OPEN-QUESTIONS.md` — confirmado sem peso no MVP), exportação de relatórios, gráficos/tendências ao longo do tempo, filtro por período. O MVP é a tabela de resultados por sala — mais que isso é over-engineering pra uma fase de "acompanhamento básico".

---

## 2. O achado desta fase — antes de escrever qualquer linha

`classes/{classId}/resultsSummary/{studentId}` já existe no `firestore.rules` **desde muito cedo** (rascunho de fase-0, nunca usado — `grep` confirma zero referência em `functions/`, `apps/`, `tests/`):

```
match /resultsSummary/{studentId} {
  allow read: if isAccountOwner(classId) || isSelf(studentId);
  allow write: if false; // agregacao (Cloud Function)
}
```

Dois problemas, mesma classe de erro que o achado da Fase 4 (§2 de `plano-fase-4.md`) — uma regra escrita antes do dado existir, nunca exercitada de verdade:

1. **`isSelf(studentId)` vaza nota não liberada.** O sentido de `resultsSummary` é o professor ver os resultados **independente de `resultsReleased`** (RN-010 não menciona liberação — é o canal do professor). Se o aluno também puder ler o próprio documento, ele vê a nota agregada de uma atividade cujo `attemptResults` ainda nega leitura por `resultsReleased == false` — o mesmo vazamento que a separação `attempts`/`attemptResults` da Fase 4 foi desenhada pra evitar, só que por uma porta lateral. **Fix: `resultsSummary` fica 100% professor-only.** O aluno já tem o canal certo (`attemptResults`, sujeito a `resultsReleased`) — não se constrói um segundo caminho com regra de vazamento diferente pro mesmo dado.
2. **`isAccountOwner(classId)` (um `get()`) não é seguro para `list`.** Mesma lição repetida em toda fase deste projeto (`classes/{classId}/assignments`, Fase 3; `attempts`, Fase 4): `get()` contra outro documento funciona para `get` de um documento único, mas uma *query* de `list` (o professor pedindo a tabela inteira de uma vez, o caso de uso real aqui) só é comprovadamente segura quando a condição bate com um campo do próprio `resource.data` que também aparece como `where()` da query. **Fix: `resultsSummary` denormaliza `accountId`** (escrito pela Cloud Function de agregação) e a regra de `list` checa `resource.data.accountId == request.auth.uid` — sem `get()`.

Regra corrigida (substitui a de fase-0 por completo):

```
match /resultsSummary/{studentId} {
  allow get: if isAccountOwner(classId);
  allow list: if isSignedIn() && resource.data.accountId == request.auth.uid;
  allow write: if false; // so a Cloud Function de agregacao
}
```

---

## 3. Modelo de dados

```
classes/{classId}/resultsSummary/{studentId}
  accountId                         # denormalizado do professor dono da sala (list-safety, achado §2)
  assignmentScores: {
    [assignmentId]: { score, maxScore, submittedAt }
  }
  updatedAt
```

- **Sem `released`/`resultsReleased` no documento** — o professor sempre vê a nota real (RN-010); esse campo só faria sentido se o resumo também fosse lido pelo aluno, o que a §2 já descartou.
- **Sem `studentName`/`activityTitle` denormalizados** — o dashboard já cruza com `classes/{classId}/enrollments` (tem `studentName`, já lido pelo `StudentRoster` existente) e `classes/{classId}/assignments` (tem `activityTitle`, já lido pelo `AssignmentList` existente) no client. Denormalizar de novo só criaria uma terceira cópia pra manter sincronizada, sem necessidade — as duas listas já são pequenas (uma sala não tem milhares de alunos/atividades) e já são buscadas pela tela da sala mesmo sem esta fase.
- **Uma entrada por `assignmentId`, não por `attemptId`** — quando `allowRetry` permite mais de uma tentativa, a agregação junta as tentativas do mesmo assignment num só resultado (ver decisão 1, §8).

### 3.1 Índice

Nenhum índice composto novo — a query de `list` é `classes/{classId}/resultsSummary` (subcoleção já fixada pelo path) com um único `where('accountId', '==', uid)`, igualdade simples num campo só já é atendida pelo índice automático do Firestore.

---

## 4. Backend — Cloud Function (`functions/src/attempts/aggregate-results.ts` ou similar)

- **Gatilho:** `onDocumentCreated('attemptResults/{attemptId}')` — dispara uma vez por tentativa corrigida (o mesmo evento que fecha o ciclo de `submitAttempt`, Fase 4). `attemptResults` nunca é atualizado depois de criado (confirmado em `submit-attempt.ts`), então `onCreate` é suficiente — não precisa de `onWrite`.
- **Lógica:** lê o `attemptResults` recém-criado (`studentId`, `classId`, `assignmentId`, `score`, `maxScore`), lê `classes/{classId}` pra pegar o `accountId` do dono, lê a entrada atual (se houver) de `assignmentScores.{assignmentId}` numa transação e só sobrescreve se `score` novo > `score` já salvo (decisão 1, §8 — melhor tentativa vence; a primeira tentativa sempre grava, não há entrada anterior pra comparar).
- **Idempotência:** um `attemptResults` só é criado uma vez (não há re-tentativa de escrita do mesmo doc), então não precisa de proteção extra contra reprocessamento — mas a Cloud Function de trigger pode re-disparar em retry de infraestrutura (garantia "at least once" do Firestore), então a escrita em si precisa ser idempotente (é: sempre sobrescreve a mesma chave `assignmentScores.{assignmentId}` com o mesmo cálculo, não incrementa nada).

---

## 5. Security Rules — diff

Substituir o bloco de `resultsSummary` (fase-0, §2) pela versão corrigida. Nenhuma outra regra muda — `attemptResults` continua `list: false` (o professor nunca lista `attemptResults` diretamente; só lê o resumo pré-agregado).

### 5.1 Casos de teste de Rules (`tests/rules/`, novo arquivo `results-summary.rules.test.ts`)

1. Professor dono lê (`get`) o resumo de um aluno da própria sala
2. Professor dono lista (`list`) os resumos da própria sala
3. Professor de outra sala não lê nem lista
4. Aluno não lê o próprio resumo (nem `get`, nem `list`) — o teste que prova o achado §2.1
5. Cliente não escreve `resultsSummary` (só a Cloud Function)

---

## 6. Frontend

- **Nova rota `/salas/[classId]/resultados`** (em vez de embutir na tela da sala já carregada — roster + atividades + resumo de resultados numa página só fica denso demais). Link "Ver resultados" na tela da sala (`TeacherClassDetail`), visível só pro professor (mesma tela que já bifurca por papel desde a Fase 4).
- **Uma tabela só** (decisão 2, §8): linhas = alunos (nome vindo do roster já existente), colunas = atividades atribuídas (título vindo da lista já existente), célula = `score / maxScore` (ou "—" se o aluno não tentou ainda). Cobre as 3 dimensões do RF-018 ("sala" = a página inteira, "aluno" = cada linha, "atividade" = cada coluna) numa tela só, sem 3 rotas separadas.
- Sem edição, sem exportação, sem gráfico — só leitura (`watchResultsSummary`, um `onSnapshot` de `list` na subcoleção).

---

## 7. O que dá (e o que não dá) para testar de verdade

- A agregação em si (Cloud Function reagindo a `attemptResults`) é testável por integração (Fase 4 já tem o padrão: `firebase-functions-test` + emulador), sem precisar de E2E de UI pra cada caso.
- O achado §2 (rule antiga vazando pro aluno) é testado por rules, não por UI — mesmo padrão da Fase 4 (rules #10 daquela fase).
- E2E cobre o caminho feliz: professor com uma sala, dois alunos, duas atividades resolvidas, revisita a sala e vê a tabela com as notas certas — sem esperar liberação (RN-010, a diferença que esta fase testa de verdade pela primeira vez).

---

## 8. Decisões — confirmadas

1. ✅ **Melhor tentativa vence.** Quando `allowRetry` permite mais de uma tentativa `GRADED` na mesma atividade, a Cloud Function de agregação só sobrescreve `assignmentScores.{assignmentId}` se a nova pontuação (`score`) for maior que a já registrada — nunca piora um resultado já salvo. Alinhado com o propósito de `allowRetry` (chance de melhorar, RN-007), não com penalizar a média.
2. ✅ **Uma tabela por sala.** Rota `/salas/[classId]/resultados`: linhas = alunos, colunas = atividades, célula = nota. Cobre as 3 dimensões do RF-018 (sala = a página, aluno = linha, atividade = coluna) numa tela só — sem 3 rotas separadas.

---

## 9. Quebra em PRs

| PR | Título | Entrega |
|---|---|---|
| **5.1** | `feat(results): fundação — rules, resultsSummary, agregação` | ✅ Regra corrigida de `resultsSummary` (§2) + `results-summary.rules.test.ts`; Cloud Function de agregação (`onDocumentCreated`) + teste de integração |
| **5.2** | `feat(web): dashboard de resultados do professor` | ✅ Rota `/salas/[classId]/resultados`, tabela aluno × atividade, link a partir da tela da sala; E2E completo (professor com aluno/2 atividades vê a tabela certa sem liberar resultados) |

Só 2 PRs — a fase é pequena (uma Cloud Function de agregação + uma tela de leitura), diferente da Fase 4 (que teve 8). PR 5.1 é pré-requisito de 5.2 (a tela não tem o que mostrar sem a agregação escrevendo dados).

---

## 10. Riscos

- **O achado do §2 é o risco central da fase** — mesma classe do achado da Fase 4: se a regra de fase-0 for deixada como está (ou "só" removido o `get()` sem também remover `isSelf`), o vazamento existe mesmo sem nenhuma tela nova o expor via UI — basta o aluno saber o path do documento. Mitigado com o teste de rules #4 (§5.1) **antes** de qualquer código de agregação.
- **Fan-out de escrita:** cada `submitAttempt` agora dispara uma segunda escrita (via trigger) em `resultsSummary`. Volume baixo no MVP (mesma ressalva já registrada na Fase 4 pra "salvar progresso"), não é um risco de custo real ainda.

---

## 11. Checklist de conclusão da fase

- [x] `resultsSummary` com a regra corrigida (professor-only, `list` list-safe) — testado por rules, não só por UI
- [x] Cloud Function de agregação reagindo a `attemptResults`, testada por integração
- [x] Dashboard do professor: tabela aluno × atividade em `/salas/[classId]/resultados`, sem depender de liberação (RN-010)
- [x] E2E: professor com sala/alunos/atividades resolvidas revisita e vê a tabela de resultados certa
- [x] `docs/IMPLEMENTATION-PLAN.md` — Fase 5 marcada como ✅

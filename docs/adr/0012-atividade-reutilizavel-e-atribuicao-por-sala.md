# ADR-012 — Atividade reutilizável (repositório do professor) e atribuição por sala

## Status

Aceito — decisão do stakeholder registrada em `docs/OPEN-QUESTIONS.md` (2026-09-09). Substitui a modelagem de `Activity` como subcoleção de `classes/{classId}` descrita nas versões anteriores do plano de implementação.

**Refinado pelo ADR-014** (imutabilidade e versionamento de atividades já iniciadas por alunos).

## Contexto

O SDD original (seção 7 e 18) modelava `Activity` como filha de uma única sala. As questões em aberto "Professor poderá compartilhar uma atividade entre salas?", "Uma atividade poderá pertencer a mais de uma sala?" e "Conteúdo poderá ser reutilizado entre atividades?" foram respondidas com **sim** já no MVP:

> A atividade criada pelo professor fica no repositório de atividades daquele professor. A atividade pode ser utilizada em N salas distintas.

Isso era explicitamente marcado como **decisão bloqueante para a Fase 3** no plano de implementação (seção 3.2), justamente por exigir mudança estrutural no modelo de dados.

## Decisão

### 1. Duas entidades distintas

- **`activities/{activityId}` — repositório de atividades do professor.** Coleção top-level. É o "conteúdo" da atividade (enunciado, itens, gabarito, pontuação), pertencente a um `accountId`, independente de qualquer sala. Estados de autoria: `DRAFT` (em edição) → `READY` (pronta para atribuir) → `LOCKED` (já iniciada por algum aluno — imutável, ver ADR-014) → `ARCHIVED`.
- **`classes/{classId}/assignments/{assignmentId}` — atribuição de uma atividade a uma sala.** É a atividade "aplicada" numa turma, com as propriedades que variam por sala: prazo, ordem na lista, número de tentativas permitidas, janela de liberação de resultados. Estados: `PUBLISHED` → `CLOSED`.

### 2. Snapshot de conteúdo no momento da atribuição

Ao atribuir/publicar uma atividade numa sala, a Cloud Function `publishAssignment` congela o conteúdo em **dois documentos separados**:

- `classes/{classId}/assignments/{assignmentId}.contentSnapshot` — **só a parte visível ao aluno** (enunciados, opções, sem gabarito). Legível pelo aluno matriculado.
- `assignmentKeys/{assignmentId}` — gabarito e regras de pontuação congelados. Coleção top-level **sem leitura pelo client**; só o Admin SDK lê, dentro de `submitAttempt`.

Consequências:

- o professor pode continuar editando a atividade no repositório sem afetar as salas onde ela já foi aplicada;
- alunos leem só o `assignment` da sala em que estão matriculados — não precisam de acesso de leitura à coleção `activities` (a regra de segurança fica simples);
- o gabarito nunca trafega para o aluno junto com o enunciado — condição necessária para o ADR-013 (liberação controlada de resultados);
- enquanto nenhum aluno tiver iniciado a atividade, o professor ainda pode editá-la e re-sincronizar as salas sem tentativas; a partir da primeira tentativa a atividade é congelada e a correção passa a ser por clone (ADR-014).

Atualizar uma sala para a versão mais nova da atividade é uma ação explícita do professor (re-publicar o assignment), fora do fluxo automático.

### 3. Modelo resultante (detalhe no plano de implementação, seção 3)

```text
activities/{activityId}                       # repositório do professor
  accountId, title, description, type, difficulty, tags[],
  status (DRAFT | READY | LOCKED | ARCHIVED),
  locked, lockedAt, clonedFrom,               # ver ADR-014
  createdAt, updatedAt

activities/{activityId}/items/{itemId}
  position, prompt, configuration, points

classes/{classId}/assignments/{assignmentId}
  activityId, activityTitle, type,
  contentSnapshot,                                     # só o enunciado — sem gabarito
  status (PUBLISHED | CLOSED), position, publishedAt, dueDate,
  allowRetry, maxAttempts,
  startedCount, firstStartedAt,                        # ver ADR-014
  resultsPolicy, resultsReleased, resultsReleasedAt,   # ver ADR-013
  createdAt, updatedAt

assignmentKeys/{assignmentId}                          # gabarito congelado, fechado ao client
  classId, gradingConfig

attempts/{attemptId}
  assignmentId, classId, activityId, studentId,        # assignmentId é o novo vínculo
  startedAt, submittedAt, status, score, maxScore
```

## Consequências

- `attempts` passa a referenciar `assignmentId` (além de `classId` e `activityId`, mantidos desnormalizados). `max_attempts` (RN-007) é contado por `assignment`, não por atividade — o mesmo aluno pode refazer a "mesma" atividade em salas diferentes.
- `resultsSummary` da sala passa a ser indexado por `assignmentId`.
- A Fase 3 ganha o CRUD do repositório de atividades, o fluxo de atribuição, e as operações `cloneActivity` / `swapAssignmentActivity` (ADR-014); a validação de RN-006 (não publicar configuração inválida) roda no `publishAssignment`.
- `contentSnapshot` duplica o conteúdo por sala — custo de armazenamento aceitável na escala do MVP; se um dia pesar, dá para mover para uma subcoleção `assignments/{id}/items`.
- Índice novo: `activities` por `accountId ASC, status ASC, updatedAt DESC` (listar o repositório do professor).

## Alternativas consideradas

- **Referência viva (sem snapshot), com a atividade travada para edição enquanto tiver assignment publicado:** menos duplicação de dados, mas obriga o professor a duplicar a atividade para qualquer ajuste e complica a regra de leitura do aluno (precisaria de acesso a `activities` de outro caminho). Não escolhida.
- **Manter `Activity` na sala e permitir "copiar para outra sala":** cada cópia vira uma atividade independente — o professor perde a noção de "minha atividade" única e não há reuso real de conteúdo. Contraria a decisão do stakeholder. Não escolhida.
- **Coleção de junção `activityClasses` top-level (N:N puro, sem snapshot):** resolve o vínculo, mas não resolve o versionamento de conteúdo nem simplifica as regras. Snapshot no assignment é mais direto.

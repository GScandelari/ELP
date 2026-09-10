# ADR-014 — Imutabilidade e versionamento de atividades em uso

## Status

Aceito — refinamento do ADR-012, decisão do stakeholder (2026-09-10).

## Contexto

O ADR-012 definiu que a atividade vive no repositório do professor e que seu conteúdo é congelado num `contentSnapshot` por sala no momento da atribuição. Ficou em aberto o que acontece quando o professor precisa **corrigir** uma atividade (erro de conteúdo, divergência percebida depois) que **já está em uso** — ou seja, algum aluno já iniciou uma tentativa em alguma sala.

Editar livremente nesse ponto corromperia tentativas em andamento e a base de correção. Proibir qualquer correção prejudica o professor. A decisão equilibra os dois casos.

## Decisão

### 1. Gatilho de bloqueio

Uma atividade do repositório passa para o estado **`LOCKED`** assim que **a primeira tentativa é criada** (`createAttempt`) em **qualquer** `assignment` derivado dela, em **qualquer** sala.

"Iniciada" = existe um documento em `attempts` referenciando um assignment dessa atividade — **não** é necessário ter sido enviada.

Enquanto nenhuma tentativa existir, a atividade `READY` continua **editável no lugar**, mesmo que já atribuída a salas.

### 2. Consequências de `LOCKED`

- A atividade **não pode mais ser editada** no repositório.
- A atividade **não pode ser atribuída a novas salas**.
- Os `assignments` já existentes seguem funcionando normalmente — o `contentSnapshot` de cada um já estava congelado (ADR-012).
- A atividade `LOCKED` ainda pode ser `ARCHIVED` (sai da lista do repositório) sem afetar os assignments em andamento.

### 3. Corrigir uma atividade `LOCKED` → clonar

O professor **clona** a atividade (`cloneActivity`): cópia integral de `activities/{activityId}` + subcoleção `items` para uma nova `activities/{novoId}` com `status = DRAFT` e `clonedFrom = {activityId}`. A cópia é uma atividade independente e editável normalmente.

### 4. Propagar a versão corrigida para as salas

Caso a caso, por sala:

- **Assignment sem nenhuma tentativa iniciada** (`startedCount == 0`): o professor pode **substituir** a atividade do assignment pela versão clonada — `swapAssignmentActivity` re-congela `contentSnapshot` e `assignmentKeys` a partir da nova atividade, **mantendo** prazo, tentativas, posição e política de liberação do assignment.
- **Assignment com ao menos uma tentativa iniciada:** **não é alterado.** Aquela turma conclui na versão que os alunos começaram; eventual correção é tratada pelo professor na avaliação/feedback daquela turma.

### 5. Campos de apoio (detalhe no plano de implementação)

```text
activities/{activityId}
  ... status, locked (bool), lockedAt, clonedFrom

classes/{classId}/assignments/{assignmentId}
  ... startedCount, firstStartedAt
```

`createAttempt` (callable, Admin SDK) faz numa transação: cria o `attempt`, incrementa `assignment.startedCount` (grava `firstStartedAt` na primeira tentativa) e marca `activity.locked = true` / `status = LOCKED` se ainda não estiver.

## Consequências

- `updateActivity` e `publishAssignment` (para nova sala) recusam se `activity.locked == true`.
- `swapAssignmentActivity` recusa se `assignment.startedCount > 0`.
- Um professor pode acumular várias versões de uma atividade (`v1` LOCKED com turmas em andamento, `v2` em uso, ...). `clonedFrom` permite a UI mostrar a linhagem ("v2 de …").
- Para saber se uma atividade pode ser editada, basta ler o booleano `locked` — sem varrer a coleção `attempts`.
- O aviso de que a atividade "vai travar ao ser iniciada" deve aparecer na UI antes da primeira tentativa, para o professor revisar o conteúdo enquanto ainda pode.

## Alternativas consideradas

- **Travar a atividade já na primeira atribuição** (como o rascunho anterior do ADR-012 sugeria): simples, mas impede ajustar uma atividade recém-atribuída que ninguém começou — atrito desnecessário. Rejeitada.
- **Edição livre com versionamento automático de cada assignment:** cópias e complexidade sem pedido claro; o professor perde controle sobre o que muda em qual turma. Rejeitada.
- **Bloquear por assignment, não pela atividade:** a atividade seguiria editável para novas salas enquanto uma turma já a executa — abre espaço para "qual é a atividade de verdade?". Bloquear a atividade inteira e clonar é mais previsível.

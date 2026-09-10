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

### 4. Propagar uma nova versão para as salas

Vale tanto para uma **edição no lugar** (atividade ainda não travada — a "nova versão" é a própria atividade editada) quanto para uma **versão clonada** (atividade travada). Editar a atividade **nunca** altera sozinho as salas já atendidas; a atualização de cada sala é sempre uma ação explícita. Caso a caso, por sala:

- **Assignment sem nenhuma tentativa iniciada** (`startedCount == 0`): o professor pode **atualizar/substituir** a atividade do assignment pela nova versão — `swapAssignmentActivity` re-congela `contentSnapshot` e `assignmentKeys` a partir da atividade de origem informada (a mesma, após edição no lugar, ou o clone), **mantendo** prazo, tentativas, posição e política de liberação do assignment.
- **Assignment com ao menos uma tentativa iniciada:** **não é alterado.** Aquela turma conclui na versão que os alunos começaram; eventual correção é tratada pelo professor na avaliação/feedback daquela turma, ou encerrando a atribuição atual e publicando a nova versão como uma atividade separada na mesma sala.

### 5. Campos de apoio (detalhe no plano de implementação)

```text
activities/{activityId}
  ... status, locked (bool), lockedAt, clonedFrom

classes/{classId}/assignments/{assignmentId}
  ... startedCount, firstStartedAt
```

`createAttempt` (callable, Admin SDK) faz numa transação: cria o `attempt`, incrementa `assignment.startedCount` (grava `firstStartedAt` na primeira tentativa) e marca `activity.locked = true` / `status = LOCKED` se ainda não estiver.

### 6. Cenários de edição

Situação da atividade **A** e o que acontece quando o professor pede para editá-la:

| # | Situação | O professor pode editar A? | Como levar a mudança às salas |
|---|---|---|---|
| 1 | A em **1 sala**, **0 tentativas** | Sim, no lugar (A está `READY`) | "Atualizar nesta sala" quando quiser (`startedCount == 0`) |
| 2 | A em **várias salas**, **0 tentativas** em todas | Sim, no lugar | Atualizar cada sala; UI oferece "aplicar a todas as salas elegíveis" |
| 3 | A em **1 sala**, **1 tentativa** já iniciada | **Não** — A está `LOCKED` | Clonar A → A2 e corrigir A2. Aquela sala não aceita substituição; tratar na correção/feedback, ou encerrar a atribuição e publicar A2 como nova atividade na sala |
| 4 | A na **sala 1 (1 tentativa)** e **sala 2 (0 tentativa)** | **Não** — 1 tentativa na sala 1 travou A inteira | Clonar A → A2. **Sala 2:** substituir por A2. **Sala 1:** mantém A (mesmas opções do caso 3). A2 vira a versão para salas novas |
| 5 | A em **nenhuma sala** | Sim, no lugar (`DRAFT` ou `READY`) | Não há nada a propagar |

O caso 4 é o incômodo assumido: uma tentativa numa sala trava a atividade inteira, mesmo com outra sala limpa (ver Alternativas consideradas). O clone + substituição na sala 2 resolve sem deixar "duas versões vivas" da mesma atividade.

### 7. O que o professor vê ao clonar

`cloneActivity` está disponível em **qualquer** atividade (também serve para "criar uma parecida com esta"). Numa atividade `LOCKED`, o botão "Editar" leva a um aviso — *"esta atividade já foi iniciada por alunos e não pode ser editada; criar uma nova versão?"* — que cai no mesmo fluxo.

**Passo 1 — criar a nova versão:**

- nome da nova versão (default `"{título} (v2)"`, incrementa se já existir);
- copia tudo (enunciado, itens, configuração, gabarito, pontos, dificuldade, tags); **não** copia vínculos com salas, tentativas nem estado — a nova nasce `DRAFT`, `locked = false`, `clonedFrom = A`;
- "Criar e editar" abre o editor na nova atividade.

**Passo 2 — editar** a nova versão no editor normal.

**Passo 3 — "Aplicar esta versão"** (tela que lista as salas onde a atividade de origem está atribuída, em três grupos):

- **Salas sem tentativas iniciadas** → caixa de seleção "Substituir pela nova versão" (mantém prazo, tentativas, ordem e política de liberação da atribuição);
- **Salas com tentativas iniciadas** → substituição bloqueada; ação secundária "Encerrar a atividade atual e adicionar a nova versão como atividade separada" (com aviso: os alunos farão de novo);
- **Outras salas** → "Atribuir a novas salas" (fluxo normal de atribuição).

**Passo 4 — versão de origem:** continua no repositório marcada como "versão anterior" enquanto alguma sala a usar com tentativas; se, após as substituições, nenhuma sala mais depender dela, a UI oferece "Arquivar a versão anterior".

> Estas telas são a intenção de UX para a Fase 3 do plano de implementação, não um wireframe final.

## Consequências

- `updateActivity` e `publishAssignment` (para nova sala) recusam se `activity.locked == true`.
- `swapAssignmentActivity` recusa se `assignment.startedCount > 0`; aceita como origem a mesma atividade (re-sync após edição no lugar) ou um clone.
- Editar uma atividade `READY` já atribuída deixa os assignments dessas salas "desatualizados" — a UI deve sinalizar e oferecer o "atualizar nesta sala".
- Um professor pode acumular várias versões de uma atividade (`v1` LOCKED com turmas em andamento, `v2` em uso, ...). `clonedFrom` permite a UI mostrar a linhagem ("v2 de …").
- Para saber se uma atividade pode ser editada, basta ler o booleano `locked` — sem varrer a coleção `attempts`.
- O aviso de que a atividade "vai travar ao ser iniciada" deve aparecer na UI antes da primeira tentativa, para o professor revisar o conteúdo enquanto ainda pode.

## Alternativas consideradas

- **Travar a atividade já na primeira atribuição** (como o rascunho anterior do ADR-012 sugeria): simples, mas impede ajustar uma atividade recém-atribuída que ninguém começou — atrito desnecessário. Rejeitada.
- **Edição livre com versionamento automático de cada assignment:** cópias e complexidade sem pedido claro; o professor perde controle sobre o que muda em qual turma. Rejeitada.
- **Bloquear por assignment, não pela atividade:** a atividade seguiria editável para novas salas enquanto uma turma já a executa — abre espaço para "qual é a atividade de verdade?". Bloquear a atividade inteira e clonar é mais previsível.

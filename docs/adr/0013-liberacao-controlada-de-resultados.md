# ADR-013 — Liberação controlada de resultados

## Status

Aceito — decisão do stakeholder registrada em `docs/OPEN-QUESTIONS.md` (2026-09-09).

## Contexto

As questões em aberto "O aluno verá a resposta correta imediatamente?" e "O professor poderá bloquear a visualização das respostas?" foram respondidas assim:

> Não. O aluno só verá a resposta correta após validação do professor ou data de encerramento da atividade. Isso evitará alunos finalizando a atividade e repassando respostas entre si durante o período aberto.

E não haverá uma flag por atividade para o professor "bloquear" — o comportamento com resultado retido é o padrão, não uma opção.

## Decisão

### 1. O que é retido

Enquanto os resultados de um `assignment` não forem liberados, o aluno vê apenas a **confirmação de envio** ("tentativa enviada, aguardando liberação"). Ficam retidos:

- a nota (`score` / percentual);
- o gabarito (resposta correta de cada item);
- a marcação de acerto/erro por item (`isCorrect`);
- o feedback por item.

O cálculo continua acontecendo **no servidor no momento do envio** (RN-008) — só a **exibição** é adiada. `attempts/{id}` chega a `status = GRADED` normalmente; a visibilidade é um gate separado, não um estado novo da máquina.

### 2. Como a liberação acontece

Cada `assignment` tem:

```text
resultsPolicy   (ON_TEACHER_RELEASE | ON_DUE_DATE | ON_CLOSE)
resultsReleased        boolean
resultsReleasedAt      timestamp | null
```

- `ON_TEACHER_RELEASE` (default): o professor chama a função `releaseAssignmentResults` (callable) → `resultsReleased = true`.
- `ON_DUE_DATE`: uma Cloud Function agendada libera automaticamente quando `now > dueDate` (exige `dueDate` definido).
- `ON_CLOSE`: liberado quando o professor muda o `assignment` para `CLOSED`.

A leitura do resultado pelo aluno (função `getAttemptResult` ou regra de leitura) só devolve o conteúdo completo se `resultsReleased == true`.

### 3. Impacto no SDD

- **RF-017 (Visualizar resultado):** passa a depender da liberação do `assignment`.
- **Nova RN-011:** "Nota, gabarito e correção por item só são exibidos ao aluno após a liberação dos resultados do assignment (por ação do professor, prazo ou encerramento)."
- **RN-008** permanece: o resultado é calculado pelo servidor no envio; a liberação só controla exibição.
- O professor sempre vê os resultados da turma imediatamente (RF-018, RN-010) — a retenção é só do lado do aluno.

## Consequências

- `submitAttempt` retorna ao client um payload mínimo (recebido/enviado), sem `score` nem `answers`, quando `resultsReleased == false`.
- A tela "Meu progresso" do aluno mostra atividades como "enviada — aguardando resultado" até a liberação.
- Cloud Function agendada adicional (`releaseResultsOnDueDate`) para a política `ON_DUE_DATE` — reaproveita o mesmo agendador do `purgeExpiredData` (ADR-011).
- Índice: `attempts` por `assignmentId ASC, status ASC` cobre tanto o dashboard do professor quanto a varredura de liberação.

## Alternativas consideradas

- **Flag `showAnswersAfterSubmit` por atividade, default `true`** (sugestão original do plano): rejeitada pelo stakeholder — abre a porta para o cenário de repasse de respostas durante o período aberto.
- **Liberar a nota, reter só o gabarito:** um aluno vendo "100%" logo após enviar já confirma que as respostas que compartilhou estavam certas. Reter os dois é o que atende ao objetivo declarado.
- **Máquina de estados do Attempt com um estado `RELEASED`:** mistura o ciclo de vida da tentativa (que é por aluno) com uma decisão que é do `assignment` (por turma). Um booleano no `assignment` é mais simples e correto.

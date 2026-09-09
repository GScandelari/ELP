# ADR-006 — Modelagem de Attempts e Answers, e estratégia de persistência de respostas (substitui ADR-008 do SDD)

## Status

Proposto — atualizado pelo ADR-012 (o vínculo de `attempts` passou a ser `assignmentId`) e pelo ADR-013 (a exibição de nota/gabarito ao aluno depende de `assignment.resultsReleased`, não de um estado da tentativa).

## Contexto

O SDD (RF-013) pede que o progresso do aluno possa ser salvo durante a resolução, e RN-008 exige que o resultado final seja calculado pelo servidor.

## Decisão

- `attempts/{attemptId}` fica em coleção **top-level** (não subcoleção de `activity`), com `assignmentId` como vínculo principal e `classId` e `activityId` desnormalizados, para permitir consultar "minhas tentativas" por aluno sem uma collection group query. (`assignmentId` introduzido no ADR-012 — antes era `activityId`.)
- Enquanto `status == IN_PROGRESS`, o client pode escrever diretamente em `attempts/{id}/answers/{itemId}` (protegido por regra: só o dono do attempt, só enquanto `IN_PROGRESS`). Isso resolve RF-013 sem precisar de uma Cloud Function a cada tecla/resposta.
- A submissão (`submitAttempt`, callable) muda `status` para `SUBMITTED`, congela `answers`, e dispara o cálculo de `is_correct`/`points_awarded`/`score` via Admin SDK (lendo o gabarito de `assignmentKeys/{assignmentId}`) — mudando `status` para `GRADED`. O payload devolvido ao aluno omite nota e gabarito enquanto `assignment.resultsReleased == false` (ADR-013).

## Consequências

- Existe uma janela onde `answers` são graváveis pelo client — está correto, é o comportamento esperado de RF-013. A regra de segurança precisa impedir edição após `SUBMITTED`.
- Se o volume de escrita direta em `answers` a cada resposta gerar custo relevante em produção, considerar debounce/batch no client antes de escrever (mitigação já registrada no plano de implementação).

## Alternativas consideradas

- **Salvar progresso só em memória local (localStorage) e enviar tudo de uma vez na submissão:** mais simples e mais barato, mas perde o progresso se o aluno trocar de dispositivo ou limpar o navegador antes de enviar. Mantida a escrita direta protegida por regra (decisão "de acordo" registrada em `docs/OPEN-QUESTIONS.md`).

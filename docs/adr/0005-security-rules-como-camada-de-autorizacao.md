# ADR-005 — Security Rules como camada de autorização (substitui ADR-005 do SDD)

## Status

Proposto

## Contexto

O SDD (seção 15 e seção 19, diagrama "Authenticated User -> Role Permission -> Resource Ownership -> Operation") descreve uma cadeia de validação por papel e posse do recurso.

## Decisão

Implementar essa cadeia em duas camadas complementares:

1. **Firestore Security Rules** para leitura e para as escritas simples (ex.: salvar progresso em `attempts` enquanto `IN_PROGRESS`), verificando `request.auth.token.role` e posse (`resource.data.teacherId == request.auth.uid`, `resource.data.studentId == request.auth.uid`).
2. **Validação dentro das Cloud Functions `callable`** para as operações com regra de negócio que Security Rules não conseguem expressar (unicidade de código de sala, `max_attempts`, cálculo de nota — RN-001, RN-007, RN-008). Essas funções usam o Admin SDK, que ignora as rules por padrão.

Regra geral: **toda escrita que determina uma nota ou resultado passa obrigatoriamente por uma Cloud Function**, nunca por escrita direta do client, mesmo que uma rule "permissiva" tecnicamente permitisse.

## Consequências

- Cobertura de teste dupla necessária: testes de Security Rules (via emulador) e testes unitários das Cloud Functions.
- Qualquer nova entidade/coleção precisa que as duas camadas sejam atualizadas em conjunto — checklist a incluir na Definition of Done (seção 31 do SDD).

## Alternativas consideradas

- **Toda a autorização só em Cloud Functions, Firestore fechado para o client:** mais simples de raciocinar, mas perde a vantagem de leitura em tempo real do Firestore direto do client (ex.: atualização ao vivo de resultado) — não escolhida.

# ADR-003 — Cloud Functions para lógica de servidor (substitui ADR-003 do SDD)

## Status

Proposto

## Contexto

O SDD original definia FastAPI como framework de backend. Sem um servidor HTTP contínuo, a lógica de servidor (validação, autorização fina, cálculo de nota — RN-008) precisa rodar em algum lugar controlado pelo backend, não pelo client.

## Decisão

Usar **Cloud Functions para Firebase (2ª geração)**, escritas em TypeScript, com duas formas de invocação:

- **Funções `callable`** para operações que o client dispara explicitamente e que precisam de lógica/transação server-side: `createClass`, `joinClassByCode`, `publishActivity`, `createAttempt`, `submitAttempt`.
- **Triggers** para reagir a eventos do próprio Firestore/Auth: `onUserCreate` (espelhar `role` como custom claim), e potencialmente `onAttemptGraded` (atualizar `resultsSummary`, ver Fase 5 do plano de implementação).

## Consequências

- Cold start ocasional em funções pouco usadas — aceitável para o volume esperado do MVP (RNF-003 pede resposta rápida "sob carga normal", não latência de milissegundos).
- Código de domínio (validators, score calculators) fica centralizado em `functions/src/`, preservando a intenção de modularidade do SDD (seção 8, Activity Engine).
- Testes de integração (seção 21 do SDD) passam a rodar contra o Firebase Emulator Suite em vez de um banco + API tradicional.

## Alternativas consideradas

- **Cloud Run com um container FastAPI** (aproveitando mais código Python do SDD original): mantém mais familiaridade com Python, mas adiciona gestão de container, cold start maior em geral, e menos integração automática com triggers do Firestore/Auth. Não escolhida nesta rodada; documentada como alternativa caso a equipe prefira Python a TypeScript nas funções.

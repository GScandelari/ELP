# ADR-001 — Arquitetura serverless sobre Firebase (substitui ADR-001 a ADR-003 do SDD)

## Status

Proposto

## Contexto

O SDD original (`docs/SDD.md`, seção 5 e 25) recomendava um monólito modular com Next.js no frontend, FastAPI + PostgreSQL no backend, e listava como decisão em aberto "Monólito modular vs. microserviços". O stakeholder definiu que o produto será construído sobre Firebase.

## Decisão

Adotar uma arquitetura serverless sobre Google Cloud/Firebase:

- **Frontend:** Next.js + React + TypeScript (mantido do SDD original), hospedado no Firebase Hosting.
- **Backend:** sem processo de servidor próprio. Lógica de negócio implementada como Cloud Functions (funções `callable` e triggers), complementada por Firestore Security Rules para controle de acesso.
- **Persistência:** Cloud Firestore substitui PostgreSQL (ver ADR-002).

Isso não é "microserviços" nem "monólito" no sentido tradicional — é um modelo onde a superfície de backend é um conjunto de funções independentes, mas o código de domínio continua organizado em um único pacote (`functions/src/`), preservando a intenção de RNF-005 (manutenibilidade, código modular).

## Consequências

- Reduz drasticamente a operação de infraestrutura (sem servidor para manter, escalar ou aplicar patch).
- Introduz limites específicos do Firestore (sem `JOIN`, transações limitadas a 500 documentos, sem full-text search nativo) que precisam ser considerados desde a modelagem de dados.
- Lock-in maior com Google Cloud/Firebase do que uma stack agnóstica com PostgreSQL.
- Exige disciplina em Security Rules como camada de autorização, já que não há mais um middleware de aplicação centralizando essa checagem.

## Alternativas consideradas

- **Monólito modular com FastAPI + PostgreSQL** (proposta original do SDD): descartada por decisão explícita do stakeholder de usar Firebase.
- **Cloud Run em vez de Cloud Functions:** ver ADR-003.

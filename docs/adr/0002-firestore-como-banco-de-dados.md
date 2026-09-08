# ADR-002 — Cloud Firestore como banco de dados (substitui ADR-006 do SDD)

## Status

Proposto

## Contexto

O SDD original definia PostgreSQL como banco relacional (seção 6 e 18). Ao adotar Firebase, as opções nativas de banco são Cloud Firestore (documentos) e Realtime Database (árvore JSON).

## Decisão

Usar **Cloud Firestore** (modo nativo), não Realtime Database.

Motivos:

- Modelo de documentos com subcoleções mapeia melhor as entidades hierárquicas do domínio (`Class -> Activity -> ActivityItem`, `Attempt -> Answer`) do que uma árvore JSON única.
- Suporta queries compostas com índices, necessárias para RF-018 (resultados por sala/atividade/aluno).
- Integração nativa com Firestore Security Rules por caminho de documento, essencial para o modelo de autorização (ADR-005).
- Melhor ferramentas de teste (`@firebase/rules-unit-testing`) e emulador local.

## Consequências

- O modelo entidade-relacionamento do SDD (seção 7 e 18) precisa ser redesenhado em coleções/subcoleções com desnormalização deliberada (ver `docs/IMPLEMENTATION-PLAN.md`, seção 3).
- Unicidade de campos (ex.: `enrollment_code` único, RN-001) não é garantida pelo banco como em SQL (`UNIQUE` constraint) — precisa ser implementada via documento-chave (`enrollmentCodes/{code}`) e transação.
- Agregações que seriam um `GROUP BY`/`JOIN` em PostgreSQL (RF-018) precisam de documentos de agregação mantidos por Cloud Functions, ou de leitura de múltiplos documentos no client.
- Não há suporte nativo a full-text search — relevante a partir da Fase 3 (banco de vocabulário/textos), quando pode ser necessário um serviço externo (Algolia, Typesense).

## Alternativas consideradas

- **Realtime Database:** descartada — pior ajuste para dados hierárquicos com queries por múltiplos campos.
- **Cloud SQL (PostgreSQL gerenciado) dentro do GCP, mantendo o modelo relacional original:** viável tecnicamente, mas abandona os benefícios de Security Rules nativas e do emulador integrado; não escolhida por não ser "Firebase" no sentido em que o stakeholder pediu.

# ELP — English Learning Platform

Plataforma de auxílio para professores de inglês e alunos interessados em fixar o aprendizado de maneira assistida ou autônoma.

Professores montam um repositório de atividades interativas de leitura e escrita e as atribuem a uma ou mais salas virtuais; alunos ingressam nas salas e realizam os exercícios com correção automática. Os resultados são liberados aos alunos pelo professor ou pelo prazo de encerramento.

O projeto é desenhado para evoluir para um produto comercial vendido a professores independentes: a arquitetura já é multi-tenant desde o MVP (múltiplos professores isolados por `accountId` num único deploy) e prevê, como fase pós-MVP, um portal admin para suporte e provisionamento de contas — ver ADR-009 e `docs/IMPLEMENTATION-PLAN.md` seção 7.

O MVP inclui uma landing page pública para divulgação (ADR-010) e é desenvolvido em conformidade com a LGPD desde o início, com tratamento diferenciado de dados de alunos menores de idade (ADR-011).

## Documentação

- [`docs/SDD.md`](docs/SDD.md) — Software Design Document original (visão de produto, requisitos, modelo de domínio, casos de uso).
- [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — plano de implementação sobre Firebase: arquitetura, modelo de dados Firestore, fases de entrega.
- [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) — registro das decisões do stakeholder sobre as questões em aberto do SDD (todas respondidas).
- [`docs/lgpd/`](docs/lgpd/) — artefatos de conformidade com a LGPD: registro das operações de tratamento, RIPD, evidências de DPA.
- [`docs/operations/`](docs/operations/) — guia de onboarding e suporte manual do MVP (sem portal admin).
- [`docs/adr/`](docs/adr/) — Architecture Decision Records.

## Stack

- **Frontend:** Next.js + React + TypeScript, Firebase Hosting.
- **Backend:** Cloud Functions for Firebase (2ª geração), Firestore Security Rules.
- **Banco de dados:** Cloud Firestore.
- **Autenticação:** Firebase Authentication (custom claims para RBAC).
- **Privacidade:** conformidade com a LGPD por design — base legal por operação, registro de consentimento, cookies essenciais no MVP.

Ver `docs/adr/` para o racional de cada escolha.

## Status

Fase de planejamento — ainda sem código. Questões em aberto do SDD já respondidas (ver `docs/OPEN-QUESTIONS.md`). Ver `docs/IMPLEMENTATION-PLAN.md` seção 6 para as fases previstas, começando pela Fase 0 (fundação: setup dos projetos Firebase na região `southamerica-east1`, monorepo, CI/CD, emuladores, shell da landing page e abertura do RIPD).

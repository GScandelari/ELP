# ELP — English Learning Platform

Plataforma de auxílio para professores de inglês e alunos interessados em fixar o aprendizado de maneira assistida ou autônoma.

Professores criam salas virtuais e atividades interativas de leitura e escrita; alunos ingressam nas salas e realizam exercícios com correção automática.

## Documentação

- [`docs/SDD.md`](docs/SDD.md) — Software Design Document original (visão de produto, requisitos, modelo de domínio, casos de uso).
- [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — plano de implementação sobre Firebase: arquitetura, modelo de dados Firestore, fases de entrega.
- [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) — questões em aberto do SDD com sugestões de default, pendentes de validação.
- [`docs/adr/`](docs/adr/) — Architecture Decision Records.

## Stack

- **Frontend:** Next.js + React + TypeScript, Firebase Hosting.
- **Backend:** Cloud Functions for Firebase (2ª geração), Firestore Security Rules.
- **Banco de dados:** Cloud Firestore.
- **Autenticação:** Firebase Authentication (custom claims para RBAC).

Ver `docs/adr/` para o racional de cada escolha.

## Status

Fase de planejamento — ainda sem código. Ver `docs/IMPLEMENTATION-PLAN.md` seção 6 para as fases previstas, começando pela Fase 0 (fundação: setup dos projetos Firebase, monorepo, CI/CD e emuladores).

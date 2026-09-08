# ADR-004 — Firebase Authentication e custom claims para RBAC (substitui ADR-004 do SDD)

## Status

Proposto

## Contexto

O SDD (seção 15 e 19) pede autenticação com token de curta duração, refresh token, hash seguro de senha, e autorização por papel (TEACHER/STUDENT/ADMIN).

## Decisão

Usar **Firebase Authentication** (provedor email/senha no MVP) para autenticação, e **custom claims** no ID token para carregar o papel (`role`) do usuário, lido tanto pelas Security Rules quanto pelas Cloud Functions.

Fluxo: no cadastro, o usuário escolhe o papel (Professor/Aluno) → documento `users/{uid}` é criado com esse `role` → uma Cloud Function (`onUserCreate` ou uma função `callable` de finalização de cadastro) espelha o `role` como custom claim, já que claims não podem ser setadas pelo client diretamente.

## Consequências

- Hash de senha, rotação de token e expiração de sessão passam a ser responsabilidade do Firebase, eliminando essa superfície de risco do time (RNF-002).
- Mudança de papel de um usuário exige invalidar/atualizar o token (o client precisa forçar refresh do ID token após a claim mudar).
- Administrador (papel futuro) pode ser criado manualmente via Admin SDK/console no MVP, sem fluxo de UI — não há requisito de auto-cadastro de admin.

## Alternativas consideradas

- **JWT emitido por backend próprio** (proposta implícita do SDD original): descartada — reimplementaria o que o Firebase Authentication já resolve, indo contra a decisão de usar Firebase.
